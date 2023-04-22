let { _, SERVER_HOSTNAME } = window;
let seiku = -1, eSlot = [], eKyouka = [], dock_id = 0, ship_id = [], ship_ke = [], mapinfo_no = -1, cell_ids = [], maparear_id = -1, mapLevels = [], mapGauges = [], mapinfo = {}, cellData = [], curCellId = -1, bosscells = [], enemyData = [], dropData = [];
let combined_type = 0, preEscape = [], escapeList = [], api_cell_data = 0;
let quest_clear_id = -1, questlist = [], questDate = 0; // 任务日期与任务列表同步更新
let friendly_status = { flag: 0, type: 0 }; // 友军状态，是否邀请，是否强力
let friendly_data = {}    // 友军数据暂存 为了保存出击前后的喷火数，延迟发送
let version = '3.3.1'
let formation = ''        // 阵型选择
let api_xal01 = ''        // 是否削甲
let firenumBefore = 0     // 进入海图时的喷火数量
let battle_data = {}      //  战斗详情数据包，result结算时发送
let api_air_base = []     // 陆航信息
let hasLBAC = false       // 陆航是否出击

import {
    reportInit, reportEnemy,
    reportShipAttr, reportShipAttrByLevelUp, whenMapStart,
    whenRemodel, reportGetLoseItem,
    reportInitEquipByDrop, reportInitEquipByBuild,
    reportInitEquipByRemodel, whenBattleResult,
    reoprtTyku, cacheSync, reportBattle, reportBattleV2,
    reportFrindly, reportAirBaseAttack, reportNextWayV2, reportQuest, reportBattleDetail
} from './report';
import { getTykuV2, getSaku25, getSaku25a, getSaku33, appendSlotitemDetail } from './common';
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
        case '/kcsapi/api_req_sortie/ld_shooting':
        case '/kcsapi/api_req_combined_battle/battle':
        case '/kcsapi/api_req_combined_battle/battle_water':
        case '/kcsapi/api_req_combined_battle/airbattle':
        case '/kcsapi/api_req_combined_battle/ld_airbattle':
        case '/kcsapi/api_req_combined_battle/ld_shooting':
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

            if(postBody.api_formation) formation = postBody.api_formation // 选择的阵型
            if(body.api_xal01) api_xal01 = body.api_xal01   // 是否削甲

            let deck1_index = Number(dock_id) - 1;
            let deck1 = _decks[deck1_index].api_ship.map(item => {
                if (item === -1) return null
                let _item = _ships[item];
                return appendSlotitemDetail(_item)
            });
            let hasTwo = combined_type && combined_type !== 0 && deck1_index == 0;
            let deck2 = hasTwo ? _decks[1].api_ship.map(item => {
                if (item === -1) return null
                let _item = _ships[item];
                return appendSlotitemDetail(_item)
            }) : [];
            // 过滤条件，夜战且邀请友军且活动海域且boss点 或者 (非boss点且有友军数据)
            if (/night/.test(path) && Number(friendly_status.flag) === 1 && maparear_id > 40 && bosscells.indexOf(curCellId) !== -1 || (bosscells.indexOf(curCellId) === -1 && body.api_friendly_info)) {
                const data = {
                    ...body.api_friendly_info,
                    maparea_id: maparear_id,
                    mapinfo_no: mapinfo_no,
                    curCellId: curCellId,
                    mapLevel: mapLevels[String(maparear_id) + String(mapinfo_no)],
                    friendly_status: friendly_status,
                    escapeList: escapeList,
                    formation: formation,  // 阵型选择
                    enemy: {
                        api_ship_ke: body.api_ship_ke,  // 敌舰id数组
                        api_ship_ke_combined: body.api_ship_ke_combined ? body.api_ship_ke_combined : [], // 联合敌舰2队id数组
                        api_e_nowhps: body.api_e_nowhps, //  昼战后剩余血量
                        api_e_nowhps_combined: body.api_e_nowhps_combined ? body.api_e_nowhps_combined : [], //  昼战后联合敌舰2队剩余血量
                        api_xal01: api_xal01,       // 是否削甲
                    },
                    deck1: deck1,
                    deck2: deck2,
                    version: version
                }
                data.friendly_status.version = version
                data.api_friendly_battle = body.api_friendly_battle
                friendly_data = data
                // reportFrindly(data)
            }
            body.poi_time = new Date().getTime()
            body.poi_path = path
            if(!battle_data.data || !battle_data.data.packet) {
                battle_data = {
                    data: {
                        fleet: {
                            LBAC: null,
                            escort: hasTwo ? deck2 : null,
                            main: deck1,
                            support: null,
                            type: hasTwo ? combined_type : 0
                        },
                        map: [maparear_id, mapinfo_no, curCellId],
                        packet: [
                            body
                        ],
                        type: bosscells.indexOf(curCellId) !== -1 ? 'Boss' : 'Normal',
                        version: version
                    }
                }
            } else {
                battle_data.data.packet.push(body)
            }
            // 支援舰队
            if(body.api_support_info) {
                battle_data.fleet.support = _decks[body.api_support_info.api_support_hourai.api_deck_id - 1].api_ship.map(item => {
                    let _item = appendSlotitemDetail(_ships[item]);
                    return _item
                })
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
            if(body.api_friendly_setting) {
                friendly_status.flag = body.api_friendly_setting.api_request_flag
                friendly_status.type = body.api_friendly_setting.api_request_type
            }
            if(friendly_data.version) {
                friendly_data.friendly_status.firenumBefore = firenumBefore
                friendly_data.friendly_status.firenum = body.api_material[4].api_value  // 喷火数量
                friendly_data.version = version
                reportFrindly(friendly_data)
                friendly_data = {}
            }
            break;
        case '/kcsapi/api_get_member/ship_deck':
            reportShipAttrByLevelUp(path);
            reportInitEquipByRemodel();
            cacheSync();
            break;
        case '/kcsapi/api_req_map/start':
            // 重置友军数据
            friendly_data = {}
            // 重置战斗数据
            battle_data = {}
            hasLBAC = false
            // 进图时喷火数量
            firenumBefore = JSON.parse(localStorage._storeCache).info.resources[4]

            if(body.api_eventmap && body.api_eventmap.api_selected_rank) {
              friendly_status.max_maphp = body.api_eventmap.api_max_maphp
              friendly_status.now_maphp = body.api_eventmap.api_now_maphp
            }
            // 重置削甲数据
            api_xal01 = ''
            // boss点位置
            bosscells = body.api_cell_data.filter(i => { return i.api_color_no === 5 }).map(i => i.api_no)

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

            {
                let deck1_index = Number(dock_id) - 1;
                let deck1 = _decks[deck1_index].api_ship.map(item => {
                    let _item = _ships[item];
                    if (_item) {
                        if(_item.api_slot_ex && _item.api_slot_ex !== -1) {
                            _item.api_slotitem_ex = _slotitems[_item.api_slot_ex].api_slotitem_id
                            _item.api_slotitem_level = _slotitems[_item.api_slot_ex].api_level
                        } else {
                            _item.api_slotitem_ex = -1
                            _item.api_slotitem_level = -1
                        }
                    }
                    return _item
                });
                let hasTwo = combined_type != 0 && deck1_index == 0;
                let deck2 = hasTwo ? _decks[1].api_ship.map(item => {
                    let _item = _ships[item];
                    if (_item) {
                        if(_item.api_slot_ex && _item.api_slot_ex !== -1) {
                            _item.api_slotitem_ex = _slotitems[_item.api_slot_ex].api_slotitem_id
                            _item.api_slotitem_level = _slotitems[_item.api_slot_ex].api_level
                        } else {
                            _item.api_slotitem_ex = -1
                            _item.api_slotitem_level = -1
                        }
                    }
                    return _item
                }) : [];
                let slot1 = deck1.map(item => {
                    if (item) return item.api_slot.map(item => {
                        return item !== -1 ? _slotitems[item] : -1
                    })
                })
                let slot2 = hasTwo ? deck2.map(item => {
                    if (item) return item.api_slot.map(item => {
                        return item !== -1 ? _slotitems[item] : -1
                    })
                }) : []

                // 去掉撤回的船计算索敌
                let s1 = {api_ship: JSON.parse(JSON.stringify(_decks[deck1_index].api_ship))}
                let s2 = {api_ship: JSON.parse(JSON.stringify(_decks[1].api_ship))}
                for(let i of escapeList) {
                    if(i > 6) {
                        s2.api_ship[i - 7] = -1;
                    }else {
                        s1.api_ship[i - 1] = -1;
                    }
                }

                // 设置延迟是因为更新escapeList的接口goback_port返回可能比较慢
                const key = String(maparear_id) + String(mapinfo_no)
                setTimeout(() => {
                    const data = {
                        // deck1_index,
                        deck1,
                        deck2,
                        slot1,
                        slot2,
                        cell_ids,
                        // curCellId,
                        mapLevels,
                        nextInfo: {
                            api_maparea_id: body.api_maparea_id,
                            api_mapinfo_no: body.api_mapinfo_no,
                            api_defeat_count: mapinfo[key].api_defeat_count,
                            api_required_defeat_count: mapinfo[key].api_required_defeat_count,
                            api_now_maphp: mapinfo[key].api_now_maphp,
                            api_max_maphp: mapinfo[key].api_max_maphp,
                        },
                        escapeList: escapeList,
                        combined_type: hasTwo ? combined_type : 0,
                        teitokuLv: _teitokuLv,
                        cell_ids: cell_ids,
                        saku: {
                            sakuOne25: getSaku25(s1).total,
                            sakuOne25a: getSaku25a(s1).total,
                            sakuOne33x1: getSaku33(s1, 1).total,
                            sakuOne33x2: getSaku33(s1, 2).total,
                            sakuOne33x3: getSaku33(s1, 3).total,
                            sakuOne33x4: getSaku33(s1, 4).total,
                            sakuTwo25: hasTwo ? getSaku25(s2).total : 0,
                            sakuTwo25a: hasTwo ? getSaku25a(s2).total : 0,
                            sakuTwo33x1: hasTwo ? getSaku33(s2, 1).total : 0,
                            sakuTwo33x2: hasTwo ? getSaku33(s2, 2).total : 0,
                            sakuTwo33x3: hasTwo ? getSaku33(s2, 3).total : 0,
                            sakuTwo33x4: hasTwo ? getSaku33(s2, 4).total : 0
                        },
                        api_cell_data: api_cell_data,
                        version: version
                    }
                    data.deck1 = data.deck1.map(i => {
                        return i ? {
                            api_ship_id: i.api_ship_id,
                            api_lv: i.api_lv,
                            api_sally_area: i.api_sally_area,
                            api_soku: i.api_soku,
                            api_slotitem_ex: i.api_slotitem_ex,
                            api_slotitem_level: i.api_slotitem_level
                        } : i
                    })
                    data.deck2 = data.deck2.map(i => {
                        return i ? {
                            api_ship_id: i.api_ship_id,
                            api_lv: i.api_lv,
                            api_sally_area: i.api_sally_area,
                            api_soku: i.api_soku,
                            api_slotitem_ex: i.api_slotitem_ex,
                            api_slotitem_level: i.api_slotitem_level
                        } : i
                    })
                    reportNextWayV2(data)
                }, 500)

            }
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
                    mapLevel: mapLevels[String(maparear_id) + String(mapinfo_no)],
                    version: version
                }
                reportAirBaseAttack(data)
            }
            {
                let deck1_index = Number(dock_id) - 1;
                let deck1 = _decks[deck1_index].api_ship.map(item => {
                    let _item = _ships[item];
                    if (_item) {
                        if(_item.api_slot_ex && _item.api_slot_ex !== -1) {
                            _item.api_slotitem_ex = _slotitems[_item.api_slot_ex].api_slotitem_id
                            _item.api_slotitem_level = _slotitems[_item.api_slot_ex].api_level
                        } else {
                            _item.api_slotitem_ex = -1
                            _item.api_slotitem_level = -1
                        }
                    }
                    return _item
                });
                let hasTwo = combined_type != 0 && deck1_index == 0;
                let deck2 = hasTwo ? _decks[1].api_ship.map(item => {
                    let _item = _ships[item];
                    if (_item) {
                        if(_item.api_slot_ex && _item.api_slot_ex !== -1) {
                            _item.api_slotitem_ex = _slotitems[_item.api_slot_ex].api_slotitem_id
                            _item.api_slotitem_level = _slotitems[_item.api_slot_ex].api_level
                        } else {
                            _item.api_slotitem_ex = -1
                            _item.api_slotitem_level = -1
                        }
                    }
                    return _item
                }) : [];
                let slot1 = deck1.map(item => {
                    if (item) return item.api_slot.map(item => {
                        return item !== -1 ? _slotitems[item] : -1
                    })
                })
                let slot2 = hasTwo ? deck2.map(item => {
                    if (item) return item.api_slot.map(item => {
                        return item !== -1 ? _slotitems[item] : -1
                    })
                }) : []

                // 去掉撤回的船计算索敌
                let s1 = {api_ship: JSON.parse(JSON.stringify(_decks[deck1_index].api_ship))}
                let s2 = {api_ship: JSON.parse(JSON.stringify(_decks[1].api_ship))}
                for(let i of escapeList) {
                    if(i > 6) {
                        s2.api_ship[i - 7] = -1;
                    }else {
                        s1.api_ship[i - 1] = -1;
                    }
                }

                // 设置延迟是因为更新escapeList的接口goback_port返回可能比较慢
                const key = String(maparear_id) + String(mapinfo_no)
                setTimeout(() => {
                    const data = {
                        // deck1_index,
                        deck1,
                        deck2,
                        slot1,
                        slot2,
                        cell_ids,
                        // curCellId,
                        mapLevels,
                        nextInfo: {
                            api_maparea_id: body.api_maparea_id,
                            api_mapinfo_no: body.api_mapinfo_no,
                            api_defeat_count: mapinfo[key].api_defeat_count,
                            api_required_defeat_count: mapinfo[key].api_required_defeat_count,
                            api_now_maphp: mapinfo[key].api_now_maphp,
                            api_max_maphp: mapinfo[key].api_max_maphp,
                        },
                        escapeList: escapeList,
                        combined_type: hasTwo ? combined_type : 0,
                        teitokuLv: _teitokuLv,
                        cell_ids: cell_ids,
                        saku: {
                            sakuOne25: getSaku25(s1).total,
                            sakuOne25a: getSaku25a(s1).total,
                            sakuOne33x1: getSaku33(s1, 1).total,
                            sakuOne33x2: getSaku33(s1, 2).total,
                            sakuOne33x3: getSaku33(s1, 3).total,
                            sakuOne33x4: getSaku33(s1, 4).total,
                            sakuTwo25: hasTwo ? getSaku25(s2).total : 0,
                            sakuTwo25a: hasTwo ? getSaku25a(s2).total : 0,
                            sakuTwo33x1: hasTwo ? getSaku33(s2, 1).total : 0,
                            sakuTwo33x2: hasTwo ? getSaku33(s2, 2).total : 0,
                            sakuTwo33x3: hasTwo ? getSaku33(s2, 3).total : 0,
                            sakuTwo33x4: hasTwo ? getSaku33(s2, 4).total : 0
                        },
                        api_cell_data: api_cell_data,
                        version: version
                    }
                    data.deck1 = data.deck1.map(i => {
                        return i ? {
                            api_ship_id: i.api_ship_id,
                            api_lv: i.api_lv,
                            api_sally_area: i.api_sally_area,
                            api_soku: i.api_soku,
                            api_slotitem_ex: i.api_slotitem_ex,
                            api_slotitem_level: i.api_slotitem_level
                        } : i
                    })
                    data.deck2 = data.deck2.map(i => {
                        return i ? {
                            api_ship_id: i.api_ship_id,
                            api_lv: i.api_lv,
                            api_sally_area: i.api_sally_area,
                            api_soku: i.api_soku,
                            api_slotitem_ex: i.api_slotitem_ex,
                            api_slotitem_level: i.api_slotitem_level
                        } : i
                    })
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
            api_air_base = body.api_air_base
            for (const map of body.api_map_info) {
                mapLevels[map.api_id] = 0;
                mapinfo[map.api_id] = {
                    api_defeat_count: map.api_defeat_count,
                    api_required_defeat_count: map.api_required_defeat_count
                }
                if (map.api_eventmap != null) {
                    mapLevels[map.api_id] = map.api_eventmap.api_selected_rank;
                    mapGauges[map.api_id] = map.api_eventmap.api_gauge_num;
                    mapinfo[map.api_id].api_now_maphp = map.api_eventmap.api_now_maphp || 0
                    mapinfo[map.api_id].api_max_maphp = map.api_eventmap.api_max_maphp || 0
                }
            }
            break;
        case '/kcsapi/api_req_map/start_air_base':
            // 设置陆航
            hasLBAC = true
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

            body.poi_time = new Date().getTime()
            body.poi_path = path
            if(battle_data.data && battle_data.data.packet) {
                battle_data.data.packet.push(body)
                if(hasLBAC) {
                    let LBAC = []

                    api_air_base.filter(i => {
                        return i.api_area_id === battle_data.data.map[0] && i.api_action_kind === 1
                    }).map(i => {
                        i = Object.clone(i)
                        i.api_plane_info = i.api_plane_info.map(item => {
                            item.poi_slot = _slotitems[item.api_slotid] || null
                            delete item.api_slotid
                            return item
                        })
                        LBAC.push(i)
                    })
                    battle_data.data.fleet.LBAC = LBAC
                }
                battle_data.data.api_cell_data = api_cell_data
                battle_data.data.mapLevel = mapLevels[String(maparear_id) + String(mapinfo_no)]
                battle_data.data.time = new Date().getTime()
                reportBattleDetail(battle_data)
                battle_data = {}
            }
            break;
        case '/kcsapi/api_req_hensei/combined':
            combined_type = postBody.api_combined_type
            break;
        case '/kcsapi/api_req_sortie/goback_port':
        case '/kcsapi/api_req_combined_battle/goback_port':
            escapeList = escapeList.concat(preEscape);
            escapeList = Array.from(new Set(escapeList))    // 去重
            preEscape = [];
            break;
        case '/kcsapi/api_get_member/questlist':
            let list = body.api_list

            let date = parseInt(parseInt(new Date().getTime()/1000/60/60+4)/24)
            if(quest_clear_id !== -1 && date === questDate) {
                let current,after,detail;
                current = quest_clear_id;
                after = [];
                detail = [];
                for(let item of questlist) {
                    if(item.api_no === quest_clear_id) {
                        detail.push(item);
                        break;
                    }
                }
                let ids = questlist.map(i => i.api_no);
                for(let item of list) {
                    if(ids.indexOf(item.api_no) === -1) {
                        after.push(item.api_no)
                        detail.push(item)
                    }
                }
                let data = {
                    current: current,
                    after: after,
                    detail: detail,
                    version: version
                }
                if(after.length) {
                    reportQuest(data)
                }
            }

            quest_clear_id = -1;
            questlist = list;
            questDate = parseInt(parseInt(new Date().getTime()/1000/60/60+4)/24)
            break;
        case '/kcsapi/api_req_member/set_friendly_request':
            // success
            if(body.api_result === 1) {
                friendly_status.flag = postBody.api_request_flag
                friendly_status.type = postBody.api_request_type
            }
            console.log('friendly_status2:', friendly_status)
            break;
    }
};
let handleGameRequest = (e) => {
    let { method, path, body } = e.detail ? e.detail : e;
    switch (path) {
        case '/kcsapi/api_req_kaisou/remodeling':
            whenRemodel(body);
            break;
        case '/kcsapi/api_req_quest/clearitemget':
            quest_clear_id = Number(body.api_quest_id);
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

