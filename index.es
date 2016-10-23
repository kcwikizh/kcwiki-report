var SERVER_HOSTNAME = window.SERVER_HOSTNAME;
Promise = require('bluebird');
var async = Promise.coroutine;
var {reportInit, reportEnemy,
    reportShipAttr, whenMapStart,
    whenRemodel,reportGetLoseItem,
    reportInitEquipByDrop, reportInitEquipByBuild,
    reportInitEquipByRemodel, reportPath,
    whenBattleResult, reoprtTyku, cacheSync} = require('./report');
var handleBattleResult = (e) => {
    let {rank, map, mapCell, dropShipId, deckShipId } = e.detail;
    let {_teitokuLv, _nickName, _nickNameId, _decks, _ships} = window;
    whenBattleResult(_decks, _ships);
    reoprtTyku(e.detail);
};
var handleGameRespoense = (e) => {
    let {method, path, body, postBody} = e.detail;
    let {_ships, _decks, _teitokuLv} = window;
    switch (path) {
        case '/kcsapi/api_req_combined_battle/airbattle':
        case '/kcsapi/api_req_combined_battle/battle':
        case '/kcsapi/api_req_combined_battle/midnight_battle':
        case '/kcsapi/api_req_combined_battle/sp_midnight':
        case '/kcsapi/api_req_sortie/battle':
        case '/kcsapi/api_req_battle_midnight/battle':
        case '/kcsapi/api_req_battle_midnight/sp_midnight':
        case '/kcsapi/api_req_sortie/airbattle' :
        case '/kcsapi/api_req_combined_battle/battle_water':
            reportEnemy(body);
            break;
        case '/kcsapi/api_get_member/ship_deck':
        case '/kcsapi/api_port/port':
            reportShipAttr(path);
            reportInitEquipByRemodel();
            cacheSync();
            break;
        case '/kcsapi/api_req_map/start':
            whenMapStart(_ships);
            reportGetLoseItem(body);
            break;
        case '/kcsapi/api_req_map/next':
            reportGetLoseItem(body);
            break;
        case '/kcsapi/api_get_member/material':
            reportInitEquipByRemodel();
            break;
        case '/kcsapi/api_get_member/slot_item':
            reportInitEquipByDrop(_ships);
            reportPath(_decks);
            break;
        case '/kcsapi/api_req_kousyou/getship':
            reportInitEquipByBuild(body, _ships);
            break;
    }
};
var handleGameRequest = (e) => {
    let {method, path, body} = e.detail;
    switch(path) {
        case '/kcsapi/api_req_kaisou/remodeling':
            whenRemodel(body);
            break;
    }
};
module.exports = {
    pluginDidLoad: (e) => {
        reportInit();
        window.addEventListener('game.respoense', handleGameRespoense());
        window.addEventListener('game.request', handleGameRequest());
        window.addEventListener('battle.result', handleBattleResult());
    },
    pluginWillUnload: (e) => {
        window.addEventListener('game.respoense', handleGameRespoense());
        window.addEventListener('game.request', handleGameRequest());
        window.addEventListener('battle.result', handleBattleResult());
    },
    show: false
};

