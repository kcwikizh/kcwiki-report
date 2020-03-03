let { _, SERVER_HOSTNAME } = window;
let seiku = -1, eSlot = [], eKyouka = [], dock_id = 0, ship_id = [], ship_ke = [], mapinfo_no = -1, cell_ids = [], maparear_id = -1, mapLevels = [], mapGauges = [], cellData = [], curCellId = -1, enemyData = [], dropData = [];
let combined_type = 0, preEscape = [], escapeList = [], api_cell_data = 0;
import {
    reportInit, reportEnemy,
    reportShipAttr, reportShipAttrByLevelUp, whenMapStart,
    whenRemodel, reportGetLoseItem,
    reportInitEquipByDrop, reportInitEquipByBuild,
    reportInitEquipByRemodel, whenBattleResult,
    reoprtTyku, cacheSync, reportBattle, reportBattleV2,
    reportFrindly, reportAirBaseAttack, reportNextWayV2
} from './report';
import { getTykuV2, getSaku25, getSaku25a, getSaku33 } from './common';
let handleBattleResult = (e) => {
    if (seiku != -1) {
        let { rank, map, mapCell, dropShipId, deckShipId } = e.detail;
        let { _teitokuLv, _nickName, _nickNameId, _decks, _ships } = window;
        whenBattleResult(_decks, _ships);
        reoprtTyku(eSlot, eKyouka, e.detail, seiku, dock_id, ship_id);
        seiku = -1;
        eSlot = []; eKyouka = [];
    }
};
let handleGameResponse = (e) => {
    let { method, path, body, postBody } = e.detail ? e.detail : e;
    let { _ships, _decks, _teitokuLv, _nickName, _nickNameId } = window;
    switch (path) {
        case '/kcsapi/api_req_sortie/battle':
        case '/kcsapi/api_req_sortie/airbattle':
        case '/kcsapi/api_req_sortie/ld_airbattle':
        case '/kcsapi/api_req_combined_battle/battle':
        case '/kcsapi/api_req_combined_battle/battle_water':
        case '/kcsapi/api_req_combined_battle/airbattle':
        case '/kcsapi/api_req_combined_battle/ld_airbattle':
        case '/kcsapi/api_req_combined_battle/ec_battle':
        case '/kcsapi/api_req_combined_battle/each_battle':
        case '/kcsapi/api_req_combined_battle/each_battle_water':
        case '/kcsapi/api_req_combined_battle/sp_midnight':
        case '/kcsapi/api_req_combined_battle/ec_night_to_day':
        case '/kcsapi/api_req_combined_battle/midnight_battle':
        case '/kcsapi/api_req_battle_midnight/battle':
        case '/kcsapi/api_req_battle_midnight/sp_midnight':
        case '/kcsapi/api_req_combined_battle/ec_midnight_battle':
            if (typeof body.api_ship_ke !== "undefined" && body.api_ship_ke !== null)
                ship_ke = body.api_ship_ke;
            if (typeof body.api_kouku !== "undefined" && body.api_kouku !== null
                && typeof body.api_kouku.api_stage1 !== "undefined" && body.api_kouku.api_stage1 !== null
                && typeof body.api_kouku.api_stage1.api_disp_seiku !== "undefined"
                && body.api_kouku.api_stage1.api_disp_seiku !== null)
                seiku = body.api_kouku.api_stage1.api_disp_seiku || -1;
            if (typeof body.api_eSlot !== "undefined" && body.api_eSlot !== null)
                eSlot = body.api_eSlot;
            if (typeof body.api_eKyouka !== "undefined" && body.api_eKyouka !== null)
                eKyouka = body.api_eKyouka;
            if (typeof body.api_dock_id !== "undefined" && body.api_dock_id !== null)
                dock_id = body.api_dock_id;
            /*
            在20171117更新中，至少
            '/kcsapi/api_req_sortie/battle'
            的api中的api_dock_id修改了拼写，变为api_deck_id，导致dock_id没有被正确赋值
            */
            if (typeof body.api_deck_id !== "undefined" && body.api_deck_id !== null)
                dock_id = body.api_deck_id;
            reportEnemy(body);
            enemyData.push({
                cellId: curCellId,
                enemyShips1: body.api_ship_ke ? body.api_ship_ke : [],
                enemyShips2: body.api_ship_ke_combined ? body.api_ship_ke_combined : [],
                enemyEquip1: body.api_eSlot ? body.api_eSlot : [],
                enemyEquip2: body.api_eSlot_combined ? body.api_eSlot_combined : [],
                enemyParam1: body.api_eParam ? body.api_eParam : [],
                enemyParam2: body.api_eParam_combined ? body.api_eParam_combined : [],
                enemyFormation: body.api_formation[1],
                seiku: seiku,
                tyku: (_decks.length >= dock_id && dock_id > 0) ? getTykuV2(_decks[dock_id - 1]) : -1,
            });
            if (typeof body.api_friendly_info !== "undefined" && body.api_friendly_info !== null) {
                const data = {
                    ...body.api_friendly_info,
                    maparea_id: maparear_id,
                    mapinfo_no: mapinfo_no,
                    curCellId: curCellId,
                    mapLevel: mapLevels[String(maparear_id) + String(mapinfo_no)]
                }
                reportFrindly(data)
            }
            break;
        case '/kcsapi/api_port/port':
            combined_type = body.api_combined_flag;
            reportBattle(mapinfo_no, maparear_id, cell_ids, _decks, dock_id, _ships);
            reportBattleV2(mapinfo_no, maparear_id, mapLevels, mapGauges, cellData, dock_id, enemyData, dropData, body.api_combined_flag);
            cell_ids = [];
            cellData = [];
            enemyData = [];
            dropData = [];
            curCellId = -1;
            break;
        case '/kcsapi/api_get_member/ship_deck':
            reportShipAttrByLevelUp(path);
            reportInitEquipByRemodel();
            cacheSync();
            break;
        case '/kcsapi/api_req_map/start':
            dock_id = postBody.api_deck_id;
            preEscape = [];
            escapeList = [];
            mapinfo_no = body.api_mapinfo_no;
            maparear_id = body.api_maparea_id;
            cell_ids.push(body.api_no);
            whenMapStart(_decks, _ships, _slotitems);
            reportGetLoseItem(body);
            curCellId = body.api_no;
            cellData.push({
                api_no: body.api_no,
                api_next: body.api_next,
                api_event_id: body.api_event_id ? body.api_event_id : 0,
                api_event_kind: body.api_event_kind ? body.api_event_kind : 0,
                api_itemget: body.api_itemget ? body.api_itemget : {},
                api_happening: body.api_happening ? body.api_happening : {},
            });

            api_cell_data = body.api_cell_data.length
            break;
        case '/kcsapi/api_req_map/next':
            cell_ids.push(body.api_no);
            reportGetLoseItem(body);
            curCellId = body.api_no;
            cellData.push({
                api_no: body.api_no,
                api_next: body.api_next,
                api_event_id: body.api_event_id ? body.api_event_id : 0,
                api_event_kind: body.api_event_kind ? body.api_event_kind : 0,
                api_itemget: body.api_itemget ? body.api_itemget : {},
                api_happening: body.api_happening ? body.api_happening : {},
            });
            if (typeof body.api_destruction_battle !== "undefined" && body.api_destruction_battle !== null
                && typeof body.api_destruction_battle.api_air_base_attack !== "undefined" && body.api_destruction_battle.api_air_base_attack !== null) {
                body.api_destruction_battle.api_air_base_attack = JSON.stringify(body.api_destruction_battle.api_air_base_attack)
                const data = {
                    ...body.api_destruction_battle,
                    maparea_id: maparear_id,
                    mapinfo_no: mapinfo_no,
                    curCellId: curCellId,
                    mapLevel: mapLevels[String(maparear_id) + String(mapinfo_no)]
                }
                reportAirBaseAttack(data)
            }
            {
                let deck1_index = Number(dock_id) - 1;
                let deck1 = _decks[deck1_index].api_ship.map(item => {
                    let _item = _ships[item];
                    if (_item) _item.api_slotitem_ex = _item.api_slot_ex !== -1 ? _slotitems[item] : -1;
                    return _item
                });
                let deck2 = combined_type != 0 ? _decks[1].api_ship.map(item => {
                    let _item = _ships[item];
                    if (_item) _item.api_slotitem_ex = _item.api_slot_ex !== -1 ? _slotitems[item] : -1;
                    return _item
                }) : [];
                let slot1 = deck1.map(item => {
                    if (item) return item.api_slot.map(item => {
                        return item !== -1 ? _slotitems[item] : -1
                    })
                })
                let slot2 = combined_type != 0 ? deck2.map(item => {
                    if (item) return item.api_slot.map(item => {
                        return item !== -1 ? _slotitems[item] : -1
                    })
                }) : []

                // 设置延迟是因为更新escapeList的接口goback_port返回可能比较慢
                setTimeout(() => {
                    const data = {
                        deck1,
                        deck2,
                        slot1,
                        slot2,
                        cell_ids,
                        curCellId,
                        mapLevels,
                        nextInfo: body,
                        escapeList: escapeList,
                        combined_type: combined_type,
                        teitokuLv: _teitokuLv,
                        cell_ids: cell_ids,
                        saku: {
                            sakuOne25: getSaku25(_decks[deck1_index]).total,
                            sakuOne25a: getSaku25a(_decks[deck1_index]).total,
                            sakuOne33x1: getSaku33(_decks[deck1_index], 1).total,
                            sakuOne33x2: getSaku33(_decks[deck1_index], 2).total,
                            sakuOne33x3: getSaku33(_decks[deck1_index], 3).total,
                            sakuOne33x4: getSaku33(_decks[deck1_index], 4).total,
                            sakuTwo25: combined_type != 0 ? getSaku25(_decks[1]).total : 0,
                            sakuTwo25a: combined_type != 0 ? getSaku25a(_decks[1]).total : 0,
                            sakuTwo33x1: combined_type != 0 ? getSaku33(_decks[1], 1).total : 0,
                            sakuTwo33x2: combined_type != 0 ? getSaku33(_decks[1], 2).total : 0,
                            sakuTwo33x3: combined_type != 0 ? getSaku33(_decks[1], 3).total : 0,
                            sakuTwo33x4: combined_type != 0 ? getSaku33(_decks[1], 4).total : 0
                        },
                        api_cell_data: api_cell_data
                    }
                    reportNextWayV2(data)
                }, 500)

            }
            break;
        case '/kcsapi/api_get_member/material':
            reportInitEquipByRemodel();
            break;
        case '/kcsapi/api_get_member/slot_item':
            reportInitEquipByDrop(_ships);
            break;
        case '/kcsapi/api_req_kousyou/getship':
            reportShipAttr(body.api_ship);
            reportInitEquipByBuild(body, _ships);
            break;
        //case '/kcsapi/api_req_kaisou/powerup':
        //    reportShipAttr(body.api_ship);
        //    whenRemodel(body);
        //    break;
        //case 'api_req_kaisou/marriage':
        //    reportShipAttr(body.api_data);
        //    break;
        case '/kcsapi/api_get_member/mapinfo':
            for (const map of body.api_map_info) {
                mapLevels[map.api_id] = 0;
                if (map.api_eventmap != null) {
                    mapLevels[map.api_id] = map.api_eventmap.api_selected_rank;
                    mapGauges[map.api_id] = map.api_eventmap.api_gauge_num;
                }
            }
            break;
        case '/kcsapi/api_req_map/select_eventmap_rank':
            const mapareaId = parseInt(postBody.api_maparea_id) * 10 + parseInt(postBody.api_map_no);
            const rank = parseInt(postBody.api_rank);
            mapLevels[mapareaId] = rank;
            break;
        case '/kcsapi/api_req_sortie/battleresult':
        case '/kcsapi/api_req_combined_battle/battleresult':
            dropData.push({
                cellId: curCellId,
                shipBaseExp: body.api_get_base_exp,
                teitokuExp: body.api_get_exp,
                winRank: body.api_win_rank,
                enemyName: body.api_enemy_info.api_deck_name,
                shipId: (body.api_get_ship || {}).api_ship_id || -1,
                itemId: (body.api_get_useitem || {}).api_useitem_id || -1,
            });
            if (typeof body.api_escape !== "undefined" && body.api_escape !== null) {
                if (body.api_escape.api_escape_idx && body.api_escape.api_escape_idx[0]) preEscape.push(body.api_escape.api_escape_idx[0])
                if (body.api_escape.api_tow_idx && body.api_escape.api_tow_idx[0]) preEscape.push(body.api_escape.api_tow_idx[0])
            }
            break;
        case '/kcsapi/api_req_hensei/combined':
            combined_type = postBody.api_combined_type
            break;
        case '/kcsapi/api_req_combined_battle/goback_port':
            escapeList = escapeList.concat(preEscape);
            preEscape = [];
            break;
    }
};
let handleGameRequest = (e) => {
    let { method, path, body } = e.detail ? e.detail : e;
    switch (path) {
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

