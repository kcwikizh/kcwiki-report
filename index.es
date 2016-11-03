let {_, SERVER_HOSTNAME} = window;
let seiku = -1, eSlot = [], eKyouka = [], dock_id = 0;
import { reportInit, reportEnemy,
    reportShipAttr, whenMapStart,
    whenRemodel,reportGetLoseItem,
    reportInitEquipByDrop, reportInitEquipByBuild,
    reportInitEquipByRemodel, reportPath,
    whenBattleResult, reoprtTyku, cacheSync } from './report';
let handleBattleResult = (e) => {
    let { rank, map, mapCell, dropShipId, deckShipId } = e.detail;
    let { _teitokuLv, _nickName, _nickNameId, _decks, _ships } = window;
    whenBattleResult(_decks, _ships);
    reoprtTyku(eSlot, eKyouka, e.detail, seiku, dock_id);
    seiku = -1;
    eSlot = []; eKyouka = [];
};
let handleGameResponse = (e) => {
    let {method, path, body, postBody} = e.detail;
    let {_ships, _decks, _teitokuLv, _nickName, _nickNameId} = window;
    switch (path) {
        case '/kcsapi/api_req_combined_battle/battle':
        case '/kcsapi/api_req_sortie/battle':
        case '/kcsapi/api_req_combined_battle/airbattle':
        case '/kcsapi/api_req_sortie/airbattle':
        case '/kcsapi/api_req_combined_battle/midnight_battle':
        case '/kcsapi/api_req_combined_battle/sp_midnight':
        case '/kcsapi/api_req_battle_midnight/battle':
        case '/kcsapi/api_req_battle_midnight/sp_midnight':
        case '/kcsapi/api_req_combined_battle/battle_water':
            seiku = body.api_kouku.api_stage1.api_disp_seiku || -1;
            if (typeof body.api_eSlot !== "undefined" && body.api_eSlot !== null)
                eSlot = body.api_eSlot;
            if (typeof body.api_eKyouka !== "undefined" && body.api_eKyouka !== null)
                eKyouka = body.api_eKyouka;
            if (typeof body.api_dock_id !== "undefined" && body.api_dock_id !== null)
                dock_id = body.api_dock_id;
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
let handleGameRequest = (e) => {
    let {method, path, body} = e.detail;
    switch(path) {
        case '/kcsapi/api_req_kaisou/remodeling':
            whenRemodel(body);
            break;
    }
};
export const
    pluginDidLoad = (e) => {
        reportInit();
        window.addEventListener('game.response', handleGameResponse);
        window.addEventListener('game.request', handleGameRequest);
        window.addEventListener('battle.result', handleBattleResult);
    },
    pluginWillUnload = (e) => {
        window.removeEventListener('game.response', handleGameResponse);
        window.removeEventListener('game.request', handleGameRequest);
        window.removeEventListener('battle.result', handleBattleResult);
    },
    show = false;

