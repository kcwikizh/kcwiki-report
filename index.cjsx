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


reqMap = (body, postBody) ->
  console.log JSON.stringify body
  console.log JSON.stringify postBody
  if body.api_itemget?
    # Item ID: 1 油 2 弹
    info =
      mapId : '' + body.api_maparea_id + body.api_mapinfo_no
      cellId : body.api_no
      itemId : body.api_itemget.api_id
      count : body.api_itemget.api_getcount
    console.log "(#{info.mapId}-#{info.cellId}) Get <#{info.itemId}>: #{info.count}"
    # TODO: post data to backend
  if body.api_happening? and body.api_happening.api_type == 1
    # Bullet - Type:1 IconId:2
    # Fuel - Type:1 IconId:1
    info = 
      mapId : '' + body.api_maparea_id + body.api_mapinfo_no
      cellId : body.api_no
      typeId: body.api_happening.api_icon_id
      count: body.api_happening.api_count
      dantan: body.api_happening.dantan
    console.log "(#{info.mapId}-#{info.cellId}) Lost <#{info.typeId}>: #{info.count}"
    # TODO: post data to backend

if config.get('plugin.KcwikiReporter.enable', true)
  # Drop ship record
  drops = []
  __ships = {}
  window.addEventListener 'game.response', async (e) ->
    {method, path, body, postBody} = e.detail
    {_ships, _decks, _teitokuLv} = window
    console.log "Path: #{path}"
    switch path
      # Debug
      when '/kcsapi/api_req_sortie/battle', '/kcsapi/api_req_sortie/battleresult', '/kcsapi/api_req_combined_battle/battle_water'
        console.log JSON.stringify body
        console.log JSON.stringify postBody
      when '/kcsapi/api_req_map/start'
        __ships = _.clone _ships
        reqMap body, postBody
      when '/kcsapi/api_req_map/next'
        reqMap body, postBody
      when '/kcsapi/api_port/port'
        drops = []
      when '/kcsapi/api_get_member/slot_item'
        break if _.keys(__ships).length is 0
        _newShips = {}
        _keys = _.keys _ships
        __keys = _.keys __ships
        _newKeys = _.difference _keys,__keys
        _newShips[_ships[key].api_sortno] = _ships[key].api_slot for key in _newKeys
        for shipno,slots of _newShips
          _newShips[shipno] = (_slotitems[slot].api_sortno for slot in slots when slot isnt -1)
        console.log JSON.stringify _newShips
        # TODO: post data to backend

  # Drop ship report
  window.addEventListener 'battle.result', async (e) ->
    {rank, boss, map, mapCell, quest, enemy, dropShipId, enemyShipId, enemyFormation, getEventItem} = e.detail
    {_teitokuLv, _nickName, _nickNameId, _decks} = window
    console.log e
    tyku = getTyku(_decks[0])
    console.log "编队<1>制空值: #{tyku}"
    info = 
      mapId: map
      cellId: mapCell
      tyku: tyku
      rank: rank

module.exports =
  name: 'Kcwiki-Reporter'
  author: [<a key={0} href="https://github.com/grzhan">grzhan</a>]
  displayName: <span><FontAwesome key={0} name='pie-chart' /> 舰娘百科数据收集</span>
  description: '舰娘百科数据收集插件'
  show: false
  version: REPORTER_VERSION
