{_, SERVER_HOSTNAME} = window
Promise = require 'bluebird'
async = Promise.coroutine
request = Promise.promisifyAll require 'request'
REPORTER_VERSION = '1.0.0'

# Tyku
# 制空値 = [(艦載機の対空値) × √(搭載数)] の総計 + 熟練補正
getTyku = (deck) ->
  {$ships, $slotitems, _ships, _slotitems} = window
  basicTyku = alvTyku = totalTyku = 0
  for shipId in deck.api_ship
    continue if shipId == -1
    ship = _ships[shipId]
    for itemId, slotId in ship.api_slot
      continue unless itemId != -1 && _slotitems[itemId]?
      item = _slotitems[itemId]
      # Basic tyku
      if item.api_type[3] in [6, 7, 8]
        basicTyku += Math.floor(Math.sqrt(ship.api_onslot[slotId]) * item.api_tyku)
      else if item.api_type[3] == 10 && item.api_type[2] == 11
        basicTyku += Math.floor(Math.sqrt(ship.api_onslot[slotId]) * item.api_tyku)
      # Alv
      if item.api_type[3] == 6 && item.api_alv > 0 && item.api_alv <= 7
        alvTyku += [0, 1, 4, 6, 11, 16, 17, 25][item.api_alv]
      else if item.api_type[3] in [7, 8] && item.api_alv == 7
        alvTyku += 3
      else if item.api_type[3] == 10 && item.api_type[2] == 11 && item.api_alv == 7
        alvTyku += 9
  totalTyku = basicTyku + alvTyku

  basic: basicTyku
  alv: alvTyku
  total: totalTyku



if config.get('plugin.KcwikiReporter.enable', true)
  # Drop ship record
  drops = []
  __ships = {}
  _path = []
  _map = ''
  combined = false
  reqMap = (body, postBody) ->
    console.log JSON.stringify body
    console.log JSON.stringify postBody
    _map = '' + body.api_maparea_id + body.api_mapinfo_no
    _path.push body.api_no
    if body.api_itemget?
      # Item ID: 1 油 2 弹
      info =
        mapId : _map
        cellId : body.api_no
        itemId : body.api_itemget.api_id
        count : body.api_itemget.api_getcount
      console.log "(#{info.mapId}-#{info.cellId}) Get <#{info.itemId}>: #{info.count}"
      # TODO: post data to backend
    if body.api_happening? and body.api_happening.api_type == 1
      # Bullet - Type:1 IconId:2
      # Fuel - Type:1 IconId:1
      info = 
        mapId : _map
        cellId : body.api_no
        typeId: body.api_happening.api_icon_id
        count: body.api_happening.api_count
        dantan: body.api_happening.dantan
      console.log "(#{info.mapId}-#{info.cellId}) Lost <#{info.typeId}>: #{info.count}"
      # TODO: post data to backend

  window.addEventListener 'game.response', async (e) ->
    {method, path, body, postBody} = e.detail
    {_ships, _decks, _teitokuLv} = window
    console.log "Path: #{path}"
    switch path
      # Debug
      when '/kcsapi/api_req_combined_battle/airbattle', '/kcsapi/api_req_combined_battle/battle', '/kcsapi/api_req_combined_battle/midnight_battle', '/kcsapi/api_req_combined_battle/sp_midnight', '/kcsapi/api_req_sortie/battle', '/kcsapi/api_req_battle_midnight/battle', '/kcsapi/api_req_battle_midnight/sp_midnight', '/kcsapi/api_req_sortie/airbattle', '/kcsapi/api_req_combined_battle/battle_water'
        console.log JSON.stringify body
        console.log JSON.stringify postBody
        info = 
          id: body.api_ship_ke[1..]
          maxhp: body.api_maxhps[7..]
          slots: body.api_eSlot
          param: body.api_eParam
        # TODO: post data to backend
      when '/kcsapi/api_req_sortie/battleresult'
        console.log JSON.stringify body
        console.log JSON.stringify postBody
      when '/kcsapi/api_req_map/start'
        combined = false
        _path = []
        __ships = _.clone _ships
        reqMap body, postBody
      when '/kcsapi/api_req_map/next'
        reqMap body, postBody
      when '/kcsapi/api_port/port'
        drops = []
      when '/kcsapi/api_get_member/slot_item'
        if _.keys(__ships).length isnt 0
          _newShips = {}
          _keys = _.keys _ships
          __keys = _.keys __ships
          _newKeys = _.difference _keys,__keys
          _newShips[_ships[key].api_sortno] = _ships[key].api_slot for key in _newKeys
          for shipno,slots of _newShips
            _newShips[shipno] = (_slotitems[slot].api_sortno for slot in slots when slot isnt -1)
          info =
            ships: _newShips
          __ships = {}
          # TODO: post data to backend
        if _path.length isnt 0
          decks = []
          decks[0] = (_ships[shipId].api_sortno for shipId in _decks[0].api_ship)
          decks[1] = (_ships[shipId].api_sortno for shipId in _decks[1].api_ship) if combined
          info = 
            path: _path
            decks: decks
            map: _map
          # TODO: post data to backend
      when '/kcsapi/api_req_kousyou/createship'
        __ships = _.clone _ships
      when '/kcsapi/api_req_kousyou/getship'
        console.log JSON.stringify

  # Drop ship report
  window.addEventListener 'battle.result', async (e) ->
    {rank, map, mapCell, dropShipId, deckShipId } = e.detail
    {_teitokuLv, _nickName, _nickNameId, _decks} = window
    console.log e.detail
    combined = true if deckShipId.length > 6
    tyku = getTyku(_decks[0]).total
    tyku += getTyku(_decks[1]).total if deckShipId.length > 6
    console.log "编队制空值: #{tyku}"
    info = 
      mapId: map
      cellId: mapCell
      tyku: tyku
      rank: rank
    # TODO: post data to backend

module.exports =
  name: 'Kcwiki-Reporter'
  author: [<a key={0} href="https://github.com/grzhan">grzhan</a>]
  displayName: <span><FontAwesome key={0} name='pie-chart' /> 舰娘百科数据收集</span>
  description: '舰娘百科数据收集插件'
  show: false
  version: REPORTER_VERSION
