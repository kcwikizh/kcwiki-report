{_, SERVER_HOSTNAME} = window
Promise = require 'bluebird'
fs = require 'fs'
async = Promise.coroutine
request = Promise.promisifyAll require 'request'
{getTyku, sum, hashCode} = require './common'
KCWIKI_HOST="dev.kcwiki.moe/kwks"
TEST_HOST="133.130.100.133:8080/kwks"
CACHE_FILE='cache.json'
HOST = KCWIKI_HOST

drops = []
lvs = []
_path = []
__ships = {}
_map = ''
combined = false
cache = null

fs.stat CACHE_FILE, (err) ->
	if not err?
		fs.readFile CACHE_FILE, (err, data) ->
			if err?
				cache = new HashTable {}
			else
				cache = new HashTable JSON.parse data

reportInit = ->
	drops = []
	lvs = []
	_path = []
	__ships = {}
	_map = ''
	combined = false

reportGetLoseItem = (body) ->
	_map = '' + body.api_maparea_id + body.api_mapinfo_no
	_path.push body.api_no
	# Report getitem data
	if body.api_itemget?
		# Item ID: 1 油 2 弹
		info =
			mapId : _map
			cellId : body.api_no
			itemId : body.api_itemget.api_id
			count : body.api_itemget.api_getcount
		console.log JSON.stringify info if process.env.DEBUG
		if cache.miss info	
			request.postAsync "http://#{HOST}/getitem.action",
				form:
					data: JSON.stringify info
				headers:
					'User-Agent': "Kcwiki Reporter v#{REPORTER_VERSION}"
			.spread (response, body) ->
				console.log "getitem.action response: #{body}" if process.env.DEBUG?    
				cache.put info
	# Report dropitem data
	if body.api_happening? and body.api_happening.api_type is 1
		# Bullet - Type:1 IconId:2
		# Fuel - Type:1 IconId:1
		info = 
			mapId : _map
			cellId : body.api_no
			typeId: body.api_happening.api_icon_id
			count: body.api_happening.api_count
			dantan: body.api_happening.dantan
		console.log JSON.stringify info if process.env.DEBUG
		if cache.miss info
			request.postAsync "http://#{HOST}/dropitem.action",
				form:
					data: JSON.stringify info
				headers:
					'User-Agent': "Kcwiki Reporter v#{REPORTER_VERSION}"
			.spread (response, body) ->
				console.log "dropitem.action response: #{body}" if process.env.DEBUG?
				cache.put info

reportSlotItem = (body) ->
	if body.api_mst_slotitem?
		start = (new Date()).getTime()
		hash = hashCode JSON.stringify body.api_mst_slotitem
		end = (new Date()).getTime()
		console.log "the cost of hashCode: #{end-start}ms" if process.env.DEBUG?
		console.log "hashcode is #{hash}" if process.env.DEBUG?
		if cache.miss body.api_mst_slotitem
			try
				request.getAsync("http://#{HOST}/comHash.action?hash=#{hash}").spread (response, data) ->
					console.log "comHash.action response: #{data}" if process.env.DEBUG?
					if data is "\"update\""
						console.log data
						# console.log JSON.stringify body.api_mst_slotitem
						request.postAsync "http://#{HOST}/updateData.action",
							form:
								data: JSON.stringify body.api_mst_slotitem
							headers:
								'User-Agent': "Kcwiki Reporter v#{REPORTER_VERSION}"
						.spread (response, body) ->
							console.log "updateData.action response: #{body}" if process.env.DEBUG?
							cache.put body.api_mst_slotitem
			catch err
				console.log err

# Report enemy ship data
reportEnemy = (body) ->
  info = 
    id: body.api_ship_ke[1..]
    maxhp: body.api_maxhps[7..]
    slots: body.api_eSlot
    param: body.api_eParam
  console.log JSON.stringify info if process.env.DEBUG?
  if cache.miss info
	  try
	    request.postAsync "http://#{HOST}/enemy.action",
	      form:
	        data: JSON.stringify info
	      headers:
	        'User-Agent': "Kcwiki Reporter v#{REPORTER_VERSION}"
	    .spread (response, body) ->
	      console.log "enemy.action response: #{body}" if process.env.DEBUG?
	      cache.put info
	  catch err
	    console.log err

# data: JSON.stringify info
reportShipAttr = (path) ->
	{_ships, _decks, _teitokuLv, _slotitems} = window
  drops = [] if 'port' in path
  if lvs.length isnt 0
    decks = (_decks[0].api_ship.concat _decks[1].api_ship)
    lvsNew = (_ships[deck].api_lv for deck in decks when deck isnt -1)
    data = []
    for lv,i in lvs 
        continue if lv is lvsNew[i]
        ship = _ships[decks[i]]
        slots = ship.api_slot
        luck = ship.api_luck[0] # 運
        kaihi = ship.api_kaihi[0] # 回避
        sakuteki = ship.api_sakuteki[0]　- sum (_slotitems[slot].api_saku for slot in slots when slot isnt -1) # 索敵
        taisen = ship.api_taisen[0] - sum (_slotitems[slot].api_tais for slot in slots when slot isnt -1) # 対潜
        data.push 
          sortno: ship.api_sortno
          luck: luck
          sakuteki: sakuteki
          taisen: taisen
          kaihi: kaihi
    if data.length > 0 and cache.miss data
      try
        request.postAsync "http://#{HOST}/attr.action",
          form:
            data: JSON.stringify data
          headers:
            'User-Agent': "Kcwiki Reporter v#{REPORTER_VERSION}"
        .spread (response, body) ->
          console.log "attr.action response: #{body}" if process.env.DEBUG?
          cache.put data
      catch err
        console.log err              
      console.log JSON.stringify data if process.env.DEBUG?
    lvs = []

# Report initial equip data
reportInitEquipByDrop = (_ships)->
  if _.keys(__ships).length isnt 0
    _newShips = {}
    _keys = _.keys _ships
    __keys = _.keys __ships
    _newKeys = _.difference _keys,__keys
    if _newKeys.length > 0
      _newShips[_ships[key].api_sortno] = _ships[key].api_slot for key in _newKeys
      for shipno,slots of _newShips
        _newShips[shipno] = (_slotitems[slot].api_sortno for slot in slots when slot isnt -1)
      info =
        ships: _newShips
      __ships = {}
      console.log JSON.stringify info if process.env.DEBUG?
      if cache.miss _newShips
	      try
	        request.postAsync "http://#{HOST}/initEquip.action",
	          form:
	            # data: JSON.stringify info
	            ships: JSON.stringify _newShips
	          headers:
	            'User-Agent': "Kcwiki Reporter v#{REPORTER_VERSION}"
	        .spread (response, body) ->
	          console.log "initEquip.action response: #{body}" if process.env.DEBUG?
	          cache.put _newShips
	      catch err
	        console.log err

# Report initial equip data
reportInitEquipByBuild = (body, _ships) ->
  ship = _ships[body.api_ship.api_id]
  slots = (_slotitems[slot].api_sortno for slot in ship.api_slot when slot isnt -1)
  data = {}
  data[ship.api_sortno] = slots
  info =
    ships: data
  console.log JSON.stringify info if process.env.DEBUG?
  if cache.miss data
	  try
	    yield request.postAsync "http://#{HOST}/initEquip.action",
	      form:
	        # data: JSON.stringify info
	        ships: JSON.stringify data
	      headers:
	        'User-Agent': "Kcwiki Reporter v#{REPORTER_VERSION}"
	    .spread (response, body) ->
	      console.log "initEquip.action response: #{body}" if process.env.DEBUG?
	      cache.put data
	  catch err
	    console.log err

# Report path data
reportPath = (_decks)->
	if _path.length isnt 0
	  decks = []
	  decks[0] = (_ships[shipId].api_sortno for shipId in _decks[0].api_ship when shipId isnt -1)
	  decks[1] = (_ships[shipId].api_sortno for shipId in _decks[1].api_ship when shipId isnt -1) if combined
	  info = 
	    path: _path
	    decks: decks
	    map: _map
	  console.log JSON.stringify info if process.env.DEBUG?
	  if cache.miss info
		  try
		    yield request.postAsync "http://#{HOST}/path.action",
		      form:
		        data: JSON.stringify info
		      headers:
		        'User-Agent': "Kcwiki Reporter v#{REPORTER_VERSION}"
		    .spread (response, body) ->
		      console.log "path.action response: #{body}" if process.env.DEBUG?
		      cache.put info
		  catch err
		    console.log err

# Report tyku data
reoprtTyku = (detail) ->
	{rank, map, mapCell, dropShipId, deckShipId } = detail
	{_teitokuLv, _nickName, _nickNameId, _decks} = window
  combined = true if deckShipId.length > 6
  tyku = getTyku(_decks[0]).total
  tyku += getTyku(_decks[1]).total if deckShipId.length > 6
  console.log "Tyku value: #{tyku}" if process.env.DEBUG?
  info = 
    mapId: map
    cellId: mapCell
    tyku: tyku
    rank: rank
  if cache.miss info
	  try
	    yield request.postAsync "http://#{HOST}/tyku.action",
	      form:
	        data: JSON.stringify info
	      headers:
	        'User-Agent': "Kcwiki Reporter v#{REPORTER_VERSION}"
	    .spread (response, body) ->
	      console.log "tyku.action response: #{body}" if process.env.DEBUG?
	      cache.put info
	  catch err
	    console.log err

handleMapStart = (_ships)->
  combined = false
  _path = []
  __ships = _.clone _ships

handleBattleResult = (_decks, _ships) ->
  decks = []
  decks = (_decks[0].api_ship.concat _decks[1].api_ship)
  lvs = (_ships[deck].api_lv for deck in decks when deck isnt -1)
  console.log JSON.stringify lvs if process.env.DEBUG?

module.exports = 
	reportInit: reportInit,
	reportEnemy: reportEnemy,
	reportSlotItem: reportSlotItem,
	reportPath: reportPath,
	reportShipAttr: reportShipAttr,
	reoprtTyku: reoprtTyku,
	reportInitEquipByBuild: reportInitEquipByBuild,
	reportInitEquipByDrop: reportInitEquipByDrop,
	handleBattleResult: handleBattleResult,
	handleMapStart: handleMapStart
