{_, SERVER_HOSTNAME} = window
Promise = require 'bluebird'
async = Promise.coroutine
request = Promise.promisifyAll require 'request'
REPORTER_VERSION = '1.0.0'

if config.get('plugin.KcwikiReporter.enable', true)
  # Drop ship record
  drops = []
  window.addEventListener 'game.response', async (e) ->
    {method, path, body, postBody} = e.detail
    {_ships, _decks, _teitokuLv} = window
    console.log path
    switch path
      # Debug
      when '/kcsapi/api_req_sortie/battle', '/kcsapi/api_req_sortie/battleresult'
        console.log "Path: #{path}"
        console.log JSON.stringify body
        console.log JSON.stringify postBody
      when '/kcsapi/api_req_map/start', '/kcsapi/api_req_map/next'
        console.log "Path: #{path}"
        console.log JSON.stringify body
        console.log JSON.stringify postBody
        if body.api_itemget?
          # Item ID: 1 油 2 弹
          info =
            mapId : '' + body.api_maparea_id + body.api_mapinfo_no
            cellId : body.api_no
            itemId : body.api_itemget.api_id
            count : body.api_itemget.api_getcount
          console.log "(#{info.mapId}-#{map.cellId}) Get <#{info.itemId}>: #{info.count}"
          # TODO: post data to backend
        if body.api_happening? and body.api_happening.api_type == 1
          # 弹 - Type:1 IconId:2
          # 油 - Type:1 IconId:1
          info = 
            mapId : '' + body.api_maparea_id + body.api_mapinfo_no
            cellId : body.api_no
            typeId: body.api_happening.api_icon_id
            count: body.api_happening.api_count
            dantan: body.api_happening.dantan
          console.log "(#{info.mapId}-#{map.cellId}) Lost <#{info.itemId}>: #{info.count}"
          # TODO: post data to backend
      when '/kcsapi/api_port/port'
        drops = {}

  # Drop ship report
  window.addEventListener 'battle.result', async (e) ->
    {rank, boss, map, mapCell, quest, enemy, dropShipId, enemyShipId, enemyFormation, getEventItem} = e.detail
    {_teitokuLv, _nickName, _nickNameId} = window
    drops.push dropShipId
    console.log JSON.stringify info

module.exports =
  name: 'Kcwiki-Reporter'
  author: [<a key={0} href="https://github.com/grzhan">grzhan</a>]
  displayName: <span><FontAwesome key={0} name='pie-chart' /> 舰娘百科数据收集</span>
  description: '舰娘百科数据收集插件'
  show: false
  version: REPORTER_VERSION
