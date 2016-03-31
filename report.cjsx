{_, SERVER_HOSTNAME, APPDATA_PATH} = window
Promise = require 'bluebird'
fs = Promise.promisifyAll require 'fs-extra'
async = Promise.coroutine
request = Promise.promisifyAll require('request'), { multiArgs: true }
{getTyku, sum, hashCode, HashTable} = require './common'
path = require 'path'
KCWIKI_HOST="api.kcwiki.moe"
CACHE_FILE= path.join APPDATA_PATH, 'kcwiki-report', 'cache.json'
HOST = KCWIKI_HOST
CACHE_SWITCH = 'on'

drops = []
lvs = []
_path = []
__ships = {}
_remodelShips = []
_map = ''
_mapId = 0
_mapAreaId = 0
combined = false
cache = new HashTable {}

fs.readFileAsync CACHE_FILE, (err, data) ->
  cache = new HashTable JSON.parse data unless err?
  console.log 'Kcwiki reporter cache file not exist, will touch new one soon.' if err?.code is 'ENOENT'
  console.error err.code if err?.code isnt 'ENOENT' and err?.code

reportInit = ->
  drops = []
  lvs = []
  _path = []
  __ships = {}
  _map = ''
  _mapId = 0
  _mapAreaId = 0
  combined = false

# Report map event (etc. get resource)
reportGetLoseItem = async (body) ->
  _map = '' + body.api_maparea_id + body.api_mapinfo_no
  _mapAreaId = body.api_maparea_id
  _mapId = body.api_mapinfo_no
  _path.push body.api_no
  # Report getitem data
  if body.api_itemget?
    # Item ID: 1 油 2 弹
    info =
      mapAreaId: +_mapAreaId
      mapId : +_mapId
      cellId : +body.api_no
      eventId : +body.api_itemget.api_id
      count : +body.api_itemget.api_getcount
      eventType: 0
    console.log JSON.stringify info if process.env.DEBUG
    if cache.miss info  
      [response, repData] = yield request.postAsync "http://#{HOST}/mapEvent",
        form: info
      console.log "getitem.action response: #{repData}" if process.env.DEBUG?    
      cache.put info
  # Report dropitem data
  if body.api_happening? and body.api_happening.api_type is 1
    # Bullet - Type:1 IconId:2
    # Fuel - Type:1 IconId:1
    info = 
      mapAreaId: +_mapAreaId
      mapId : +_mapId
      cellId : +body.api_no
      eventId: +body.api_happening.api_icon_id
      count: +body.api_happening.api_count
      dantan: body.api_happening.dantan
      eventType: 1
    console.log JSON.stringify info if process.env.DEBUG
    if cache.miss info
      [response, repData] = yield request.postAsync "http://#{HOST}/mapEvent",
        form: info
      console.log "dropitem.action response: #{repData}" if process.env.DEBUG?
      cache.put info
  return

# Report enemy fleet data
reportEnemy = async (body) ->
  info = 
    enemyId: body.api_ship_ke[1..]
    maxHP: body.api_maxhps[7..]
    slots: body.api_eSlot
    param: body.api_eParam
    mapId: _mapId
    mapAreaId: _mapAreaId
    cellId: _path[-1..][0]
  console.log JSON.stringify info if process.env.DEBUG?
  if CACHE_SWITCH is 'off' or cache.miss info
    try
      [response, repData] = yield request.postAsync "http://#{HOST}/enemy",
        form: info
      console.log "enemy.action response: #{repData}" if process.env.DEBUG?
      cache.put info
    catch err
      console.log err

# Report ship attributes
reportShipAttr = async (path) ->
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
      info =
        sortno: +ship.api_sortno
        luck: +luck
        sakuteki: +sakuteki
        taisen: +taisen
        kaihi: +kaihi
        level: +lvsNew[i]
      if CACHE_SWITCH is 'off' or cache.miss info
        try
          [response, repData] = yield request.postAsync "http://#{HOST}/shipAttr",
            form: info
          console.log "attr.action response: #{repData}" if process.env.DEBUG?
          cache.put info
        catch err
          console.log err
    lvs = []

# Report initial equip data
reportInitEquipByDrop = async (_ships) ->
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
      if CACHE_SWITCH is 'off' or cache.miss _newShips
        try
          [response, repData] = yield request.postAsync "http://#{HOST}/initEquip",
            form: info
          console.log "initEquip.action response: #{repData}" if process.env.DEBUG?
          cache.put _newShips
        catch err
          console.log err
  return

# Report initial equip data
reportInitEquipByBuild = async ((body, _ships) ->
  ship = _ships[body.api_ship.api_id]
  slots = (_slotitems[slot].api_sortno for slot in ship.api_slot when slot isnt -1)
  data = {}
  data[ship.api_sortno] = slots
  info =
    ships: data
  console.log JSON.stringify info if process.env.DEBUG?
  if CACHE_SWITCH is 'off' or cache.miss data
    try
      [response, repData] = yield request.postAsync "http://#{HOST}/initEquip",
        form: info
      console.log "initEquip.action response: #{repData}" if process.env.DEBUG?
      cache.put data
    catch err
      console.log err
  return )

reportInitEquipByRemodel = async () ->
  return if _remodelShips.length is 0
  data = {}
  for apiId in _remodelShips
    ship = _ships[apiId]
    data[ship] = (_slotitems[slot].api_sortno for slot in ship.api_slot when slot isnt -1)
  if CACHE_SWITCH is 'off' or cache.miss data
    try
      [response, repData] = yield request.postAsync "http://#{HOST}/initEquip",
        form:
          ships: data
      console.log "initEquip.action response: #{repData}" if process.env.DEBUG?
      cache.put data
    catch err
      console.log err
  _remodelShips = []

# Report path data
reportPath = async (_decks)->
  if _path.length isnt 0
    decks = []
    decks[0] = (_ships[shipId].api_sortno for shipId in _decks[0].api_ship when shipId isnt -1)
    decks[1] = (_ships[shipId].api_sortno for shipId in _decks[1].api_ship when shipId isnt -1) if combined
    info = 
      path: _path
      decks: decks
      mapId: +_mapId
      mapAreaId: +_mapAreaId
    console.log JSON.stringify info if process.env.DEBUG?
    if CACHE_SWITCH is 'off' or cache.miss info
      try
        [response, repData] = yield request.postAsync "http://#{HOST}/path",
          form: info
        console.log "path.action response: #{repData}" if process.env.DEBUG?
        cache.put info
      catch err
        console.log err
  return

# Report tyku data
reoprtTyku = async (detail) ->
  {rank, map, mapCell, dropShipId, deckShipId } = detail
  {_teitokuLv, _nickName, _nickNameId, _decks} = window
  combined = true if deckShipId.length > 6
  tyku = getTyku(_decks[0]).total
  tyku += getTyku(_decks[1]).total if deckShipId.length > 6
  console.log "Tyku value: #{tyku}" if process.env.DEBUG?
  return if tyku is 0
  {api_no, api_maparea_id} = $maps[map]
  info =
    mapAreaId: +api_maparea_id 
    mapId: +api_no
    cellId: +mapCell
    tyku: tyku
    rank: rank
  if CACHE_SWITCH is 'off' or cache.miss info
    try
      [response, repData] = yield request.postAsync "http://#{HOST}/tyku",
        form: info
      console.log "Tyku api response: #{repData}" if process.env.DEBUG?
      cache.put info
    catch err
      console.log err
  return

cacheSync = ->
  fs.ensureDirSync path.join APPDATA_PATH, 'kcwiki-report'
  data = JSON.stringify cache.raw()
  cache.clear() if data.length > 1000000
  fs.writeFileAsync CACHE_FILE, data, (err) ->
    console.error JSON.stringify err if err
    console.log "Cache Sync Done." if process.env.DEBUG?
    return

whenMapStart = (_ships)->
  combined = false
  _path = []
  __ships = _.clone _ships

whenBattleResult = (_decks, _ships) ->
  decks = []
  decks = (_decks[0].api_ship.concat _decks[1].api_ship)
  lvs = (_ships[deck].api_lv for deck in decks when deck isnt -1)
  console.log JSON.stringify lvs if process.env.DEBUG?

whenRemodel = (body) ->
  _remodelShips.push body.api_id

module.exports = 
  reportInit: reportInit,
  reportGetLoseItem: reportGetLoseItem,
  reportEnemy: reportEnemy,
  reportPath: reportPath,
  reportShipAttr: reportShipAttr,
  reoprtTyku: reoprtTyku,
  reportInitEquipByBuild: reportInitEquipByBuild,
  reportInitEquipByDrop: reportInitEquipByDrop,
  reportInitEquipByRemodel: reportInitEquipByRemodel,
  whenBattleResult: whenBattleResult,
  whenMapStart: whenMapStart
  whenRemodel: whenRemodel
  cacheSync: cacheSync
