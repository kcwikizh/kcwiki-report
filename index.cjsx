{_, SERVER_HOSTNAME} = window
Promise = require 'bluebird'
async = Promise.coroutine
{reportInit, reportEnemy, reportShipAttr, whenMapStart, whenRemodel,reportGetLoseItem, reportInitEquipByDrop, reportInitEquipByBuild, reportInitEquipByRemodel, reportPath, whenBattleResult, reoprtTyku, cacheSync} = require './report'
handleBattleResult = (e) ->
  {rank, map, mapCell, dropShipId, deckShipId } = e.detail
  {_teitokuLv, _nickName, _nickNameId, _decks, _ships} = window
  whenBattleResult(_decks, _ships)
  reoprtTyku(e.detail)
handleGameResponse = (e) ->
  {method, path, body, postBody} = e.detail
  {_ships, _decks, _teitokuLv} = window
  console.log path if process.env.DEBUG?
  switch path
    when '/kcsapi/api_start2'
      reportInitEquipByRemodel()
    when '/kcsapi/api_req_combined_battle/airbattle', '/kcsapi/api_req_combined_battle/battle', '/kcsapi/api_req_combined_battle/midnight_battle', '/kcsapi/api_req_combined_battle/sp_midnight', '/kcsapi/api_req_sortie/battle', '/kcsapi/api_req_battle_midnight/battle', '/kcsapi/api_req_battle_midnight/sp_midnight', '/kcsapi/api_req_sortie/airbattle', '/kcsapi/api_req_combined_battle/battle_water'
      reportEnemy(body)
    when '/kcsapi/api_get_member/ship_deck', '/kcsapi/api_port/port'
      reportShipAttr(path)
      cacheSync()
    when '/kcsapi/api_req_map/start'
      whenMapStart(_ships)
      reportGetLoseItem(body)
    when '/kcsapi/api_req_map/next'
      reportGetLoseItem(body)
    when '/kcsapi/api_get_member/slot_item'
      reportInitEquipByDrop(_ships)
      reportPath(_decks)
    when '/kcsapi/api_req_kousyou/getship'
      reportInitEquipByBuild(body, _ships)
handleGameRequest = (e) ->
  {method, path, body} = e.detail
  switch path
    when '/kcsapi/api_req_kaisou/remodeling'
      whenRemodel(body)

module.exports =
  pluginDidLoad: (e) ->
    reportInit()
    window.addEventListener 'game.response', handleGameResponse
    window.addEventListener 'game.request', handleGameRequest
    window.addEventListener 'battle.result', handleBattleResult
  pluginWillUnload: (e) ->
    window.removeEventListener 'game.response', handleGameResponse
    window.removeEventListener 'battle.result', handleBattleResult
    window.removeEventListener 'game.request', handleGameRequest
  show: false
