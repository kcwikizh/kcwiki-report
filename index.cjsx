{_, SERVER_HOSTNAME} = window
Promise = require 'bluebird'
async = Promise.coroutine
request = Promise.promisifyAll require 'request'
REPORTER_VERSION = '1.0.0'

if config.get('plugin.KcwikiReporter.enable', true)
  # Quest
  knownQuests = []
  questReportEnabled = false
  # Map lv record
  mapLv = []
  # Create ship record
  creating = false
  kdockId = -1
  detail =
    items: []
    highspeed: -1
    kdockId: -1
    largeFlag: false
    secretary: -1
    shipId: -1
  # Game listener
  request.get "http://#{SERVER_HOSTNAME}/api/report/v2/known_quests", (err, response, body) ->
    return if err? || response.statusCode != 200
    knownQuests = JSON.parse(body).quests
    questReportEnabled = true
  window.addEventListener 'game.response', async (e) ->
    {method, path, body, postBody} = e.detail
    {_ships, _decks, _teitokuLv} = window
    console.log path
    switch path
      # Debug
      when '/kcsapi/api_req_sortie/battle'
        console.log "Path: #{path}"
        console.log JSON.stringify body
        console.log JSON.stringify postBody
      when '/kcsapi/api_req_sortie/battleresult'
        console.log "Path: #{path}"
        console.log JSON.stringify body
        console.log JSON.stringify postBody
      when '/kcsapi/api_req_map/start', '/kcsapi/api_req_map/next'
        console.log "Path: #{path}"
        console.log JSON.stringify body
        console.log JSON.stringify postBody
        if body.api_itemget?
          info = 
            mapInfoNo : body.api_mapinfo_no
            mapAreaId : body.api_maparea_id
            mapPointId : body.api_no
            itemId : body.api_itemget.api_id
            getCount : body.api_itemget.api_getcount
          console.log "Get <#{info.itemId}>: #{info.getCount}"
          # TODO: post data to backend

  # Drop ship report
  window.addEventListener 'battle.result', async (e) ->
    {rank, boss, map, mapCell, quest, enemy, dropShipId, enemyShipId, enemyFormation, getEventItem} = e.detail
    {_teitokuLv, _nickName, _nickNameId} = window
    info =
      shipId: dropShipId
      quest: quest
      enemy: enemy
      rank: rank
      isBoss: boss
      mapId: map
      cellId: mapCell
      teitokuLv: _teitokuLv
      mapLv: mapLv[map] or 0
      enemyShips: enemyShipId
      enemyFormation: enemyFormation
    console.log JSON.stringify info

module.exports =
  name: 'Kcwiki-Reporter'
  author: [<a key={0} href="https://github.com/grzhan">grzhan</a>]
  displayName: <span><FontAwesome key={0} name='pie-chart' /> 舰娘百科数据收集</span>
  description: '舰娘百科数据收集插件'
  show: false
  version: REPORTER_VERSION
