{_, SERVER_HOSTNAME} = window
Promise = require 'bluebird'
async = Promise.coroutine
{reportInit, reportSlotItem, reportEnemy, reportShipAttr, handleMapStart, reportGetLoseItem, reportInitEquipByDrop, reportInitEquipByBuild, reportPath, handleBattleResult, reoprtTyku, cacheSync} = require './report'
REPORTER_VERSION = '1.0.0'

if config.get('plugin.KcwikiReporter.enable', true)
  reportInit()
  window.addEventListener 'game.response', (e) ->
    {method, path, body, postBody} = e.detail
    {_ships, _decks, _teitokuLv} = window
    switch path
      when '/kcsapi/api_start2'
        reportSlotItem(body, _decks, _ships)
      when '/kcsapi/api_req_combined_battle/airbattle', '/kcsapi/api_req_combined_battle/battle', '/kcsapi/api_req_combined_battle/midnight_battle', '/kcsapi/api_req_combined_battle/sp_midnight', '/kcsapi/api_req_sortie/battle', '/kcsapi/api_req_battle_midnight/battle', '/kcsapi/api_req_battle_midnight/sp_midnight', '/kcsapi/api_req_sortie/airbattle', '/kcsapi/api_req_combined_battle/battle_water'
        reportEnemy(body)
      when '/kcsapi/api_get_member/ship_deck', '/kcsapi/api_port/port'
        reportShipAttr(path)
        cacheSync()
      when '/kcsapi/api_req_map/start'
        handleMapStart(_ships)
        reportGetLoseItem(body)
      when '/kcsapi/api_req_map/next'
        reportGetLoseItem(body)
      when '/kcsapi/api_get_member/slot_item'
        reportInitEquipByDrop(_ships)
        reportPath(_decks)
      when '/kcsapi/api_req_kousyou/getship'
        reportInitEquipByBuild(body, _ships)
  window.addEventListener 'battle.result', async (e) ->
    {rank, map, mapCell, dropShipId, deckShipId } = e.detail
    {_teitokuLv, _nickName, _nickNameId, _decks, _ships} = window
    handleBattleResult(_decks, _ships)
    reoprtTyku(e.detail)

module.exports =
  name: 'Kcwiki-Reporter'
  author: [<a key={0} href="https://github.com/grzhan">grzhan</a>]
  displayName: <span><FontAwesome key={0} name='pie-chart' /> 舰娘百科数据收集</span>
  description: '舰娘百科数据收集插件'
  show: false
  version: REPORTER_VERSION
