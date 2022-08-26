let { _, SERVER_HOSTNAME, APPDATA_PATH } = window;
if (_ === "undefined") {
    try {
        _ = require('lodash');
    } catch (err) {
        _ = require('underscore');
    }
}
Promise = require('bluebird');
let fs = Promise.promisifyAll(require('fs-extra'));
let request = Promise.promisifyAll(require('request'), { multiArgs: true });

import { getTyku, getTykuV2, getSaku25, getSaku25a, getSaku33, sum, hashCode, HashTable } from './common';
import { join } from 'path';
let KCWIKI_HOST = 'api.kcwiki.moe';
let CACHE_FILE = join(APPDATA_PATH, 'kcwiki-report', 'cache.json');
let HOST = KCWIKI_HOST;
let CACHE_SWITCH = 'on';
let HOST_V2 = 'www.cross-bell.com:11800'
let HOST_V3 = 'report2.kcwiki.org:17027'

let drops = [], lvs = [], _path = [], __ships = {}, __decks = [], _remodelShips = [], _map = '',
    _mapId = 0, _mapAreaId = 0, combined = false, cache = new HashTable({});

fs.readFile(CACHE_FILE, (err, data) => {
    if (typeof err == "undefined" || err == null) cache = new HashTable(JSON.parse(data));
    if (typeof err !== "undefined" && err !== null && err.code == 'ENOENT') console.log('Kcwiki reporter cache file not exist, will touch new one soon.');
    if (typeof err !== "undefined" && err !== null && err.code && err.code != 'ENOENT') console.error(err.code);
});

const reportInit = () => {
    drops = [];
    lvs = [];
    _path = [];
    __ships = {};
    __decks = [];
    _map = '';
    _mapId = 0;
    _mapAreaId = 0;
    combined = false;
};

// Report map event (etc. get resource)
const reportGetLoseItem = async (body) => {
    _map = '' + body.api_maparea_id + body.api_mapinfo_no;
    _mapAreaId = body.api_maparea_id;
    _mapId = body.api_mapinfo_no;
    _path.push(body.api_no);
    // Report getitem data
    if (typeof body.api_itemget !== "undefined" && body.api_itemget !== null) {
        // Item ID: 1 油 2 弹
        let eventId = [], count = [];
        for (let item of body.api_itemget) {
            eventId.push(+item.api_id);
            count.push(+item.api_getcount);
        }
        let info = {
            mapAreaId: +_mapAreaId,
            mapId: +_mapId,
            cellId: +body.api_no,
            eventId: eventId,
            count: count,
            eventType: 0
        };
        if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
            console.log(JSON.stringify(info));
        if (cache.miss(info)) {
            let response = await request.postAsync(`http://${HOST}/mapEvent`, { form: info });
            if (window.POI_VERSION >= 'v8.0.0')
                response = response[0];
            let status = response.statusCode, repData = response.body;
            if (status >= 300)
                console.log(status, response.statusMessage);
            if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
                console.log(`getitem.action response: ${repData}`);
            cache.put(info);
        }
    }
    //Report dropitem data
    if (typeof body.api_happening !== "undefined" && body.api_happening !== null && body.api_happening.api_type == 1) {
        // Bullet - Type:1 IconId:2
        // Fuel - Type:1 IconId:1
        let info = {
            mapAreaId: +_mapAreaId,
            mapId: +_mapId,
            cellId: +body.api_no,
            eventId: [+body.api_happening.api_icon_id],
            count: [+body.api_happening.api_count],
            dantan: body.api_happening.api_dentan,
            eventType: 1
        };
        if (process.env.DEBUG) console.log(JSON.stringify(info));
        if (cache.miss(info)) {
            let response = await request.postAsync(`http://${HOST}/mapEvent`, { form: info });
            if (window.POI_VERSION >= 'v8.0.0')
                response = response[0];
            let status = response.statusCode, repData = response.body;
            if (status >= 300)
                console.log(status, response.statusMessage);
            if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
                console.log(`dropitem.action response: ${repData}`);
            cache.put(info);
        }
    }
    return;
};

// Report enemy fleet data
const reportEnemy = async (body) => {
    let info = {
        enemyId: body.api_ship_ke,
        maxHP: body.api_e_maxhps,
        slots: body.api_eSlot,
        param: body.api_eParam,
        mapId: _mapId,
        mapAreaId: _mapAreaId,
        cellId: _path.slice(-1)[0]
    };
    if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null) console.log(JSON.stringify(info));
    if (CACHE_SWITCH == 'off' || cache.miss(info)) {
        try {
            let response = await request.postAsync(`http://${HOST}/enemy`, { form: info });
            if (window.POI_VERSION >= 'v8.0.0')
                response = response[0];
            let status = response.statusCode, repData = response.body;
            if (status >= 300)
                console.log(status, response.statusMessage);
            if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
                console.log(`enemy.action response: ${repData}`);
            cache.put(info);
        } catch (err) {
            console.error(err);
        }
    }
};

// Report ship attributes
const reportShipAttrByLevelUp = async (path) => {
    let { _ships, _decks, _teitokuLv, _slotitems } = window;
    if (path.includes('port')) drops = [];
    if (lvs.length != 0) {
        let decks = [];
        _decks.map(v => {
            decks = decks.concat(v.api_ship);
        })
        let lvsNew = decks.map(deck => {
            if (deck == -1)
                return -1
            return _ships[deck].api_lv
        });
        let data = [];
        for (let i in lvs) {
            let lv = lvs[i];
            if (lv == lvsNew[i] || lv == -1 || decks[i] == -1) continue;
            let ship = _ships[decks[i]];
            let ship_slots = ship.api_slot;
            let luck = ship.api_luck[0]; // 運
            let kaihi = ship.api_kaihi[0]; // 回避
            let sakuteki = ship.api_sakuteki[0] - sum(ship_slots.filter(ship_slot => ship_slot != -1).map(ship_slot => _slotitems[ship_slot].api_saku));// 索敵
            let taisen = ship.api_taisen[0] - sum(ship_slots.filter(ship_slot => ship_slot != -1).map(ship_slot => _slotitems[ship_slot].api_tais));// 対潜
            let info = {
                sortno: +ship.api_sortno,
                luck: +luck,
                sakuteki: +sakuteki,
                taisen: +taisen,
                kaihi: +kaihi,
                level: +lvsNew[i]
            };
            if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
                console.log(JSON.stringify(info));
            if (CACHE_SWITCH == 'off' || cache.miss(info)) {
                try {
                    let response = await request.postAsync(`http://${HOST}/shipAttr`, { form: info });
                    if (window.POI_VERSION >= 'v8.0.0')
                        response = response[0];
                    let status = response.statusCode, repData = response.body;
                    if (status >= 300)
                        console.log(status, response.statusMessage);
                    if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
                        console.log(`attr.action response: ${repData}`);
                    cache.put(info);
                } catch (err) {
                    console.log(err);
                }
            }
        }
        lvs = [];
    }
};
const reportShipAttr = async (ship) => {
    let { _slotitems } = window;
    let slots = ship.api_slot;
    let luck = ship.api_lucky[0]; // 運
    let kaihi = ship.api_kaihi[0]; // 回避
    let sakuteki = ship.api_sakuteki[0] - sum(slots.filter(slot => slot != -1).map(slot => _slotitems[slot].api_saku));// 索敵
    let taisen = ship.api_taisen[0] - sum(slots.filter(slot => slot != -1).map(slot => _slotitems[slot].api_tais));// 対潜
    let info = {
        sortno: +ship.api_sortno,
        luck: +luck,
        sakuteki: +sakuteki,
        taisen: +taisen,
        kaihi: +kaihi,
        level: +ship.api_lv
    };
    if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
        console.log(JSON.stringify(info));
    if (CACHE_SWITCH == 'off' || cache.miss(info)) {
        try {
            let response = await request.postAsync(`http://${HOST}/shipAttr`, { form: info });
            if (window.POI_VERSION >= 'v8.0.0')
                response = response[0];
            let status = response.statusCode, repData = response.body;
            if (status >= 300)
                console.log(status, response.statusMessage);
            if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
                console.log(`attr.action response: ${repData}`);
            cache.put(info);
        } catch (err) {
            console.log(err);
        }
    }
};

// Report initial equip data
const reportInitEquipByDrop = async (_ships) => {
    let { _slotitems } = window;
    if (_.keys(__ships).length != 0) {
        let _newShips = {};
        let _keys = _.keys(_ships);
        let __keys = _.keys(__ships);
        let _newKeys = _.difference(_keys, __keys);
        if (_newKeys.length > 0) {
            for (let key of _newKeys) {
                _newShips[_ships[key].api_sortno] = _ships[key].api_slot;
                let slots = _ships[key].api_slot;
                let luck = _ships[key].api_lucky[0]; // 運
                let kaihi = _ships[key].api_kaihi[0]; // 回避
                let sakuteki = _ships[key].api_sakuteki[0] - sum(slots.filter(slot => slot != -1).map(slot => _slotitems[slot].api_saku));// 索敵
                let taisen = _ships[key].api_taisen[0] - sum(slots.filter(slot => slot != -1).map(slot => _slotitems[slot].api_tais));// 対潜
                let info = {
                    sortno: +_ships[key].api_sortno,
                    luck: +luck,
                    sakuteki: +sakuteki,
                    taisen: +taisen,
                    kaihi: +kaihi,
                    level: +_ships[key].api_lv
                };
                if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
                    console.log(JSON.stringify(info));
                if (CACHE_SWITCH == 'off' || cache.miss(info)) {
                    try {
                        let response = await request.postAsync(`http://${HOST}/shipAttr`, { form: info });
                        if (window.POI_VERSION >= 'v8.0.0')
                            response = response[0];
                        let status = response.statusCode, repData = response.body;
                        if (status >= 300)
                            console.log(status, response.statusMessage);
                        if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null) {
                            console.log(response)
                            console.log(`attr.action response: ${repData}`);
                        }
                        cache.put(info);
                    } catch (err) {
                        console.log(err);
                    }
                }
            }
            for (let shipno in _newShips) {
                let slots = _newShips[shipno];
                _newShips[shipno] = slots.filter(slot => slot != -1).map(slot => _slotitems[slot].api_sortno);
            }
            let info = {
                ships: _newShips
            };
            __ships = {};
            if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
                console.log(JSON.stringify(info));
            if (CACHE_SWITCH == 'off' || cache.miss(_newShips)) {
                try {
                    let response = await request.postAsync(`http://${HOST}/initEquip`, { form: info });
                    if (window.POI_VERSION >= 'v8.0.0')
                        response = response[0];
                    let status = response.statusCode, repData = response.body;
                    if (status >= 300)
                        console.log(status, response.statusMessage);
                    if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
                        console.log(`initEquip.action response: ${repData}`);
                    cache.put(_newShips);
                } catch (err) {
                    console.error(err);
                }
            }
        }
    }
    return;
};

// Report initial equip data
const reportInitEquipByBuild = async (body, _ships) => {
    let ship = _ships[body.api_ship.api_id];
    let slots = ship.api_slot.filter(slot => slot != -1).map(slot => _slotitems[slot].api_sortno);
    let data = {};
    data[ship.api_sortno] = slots;
    let info = {
        ships: data
    };
    if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
        console.log(JSON.stringify(info));
    if (CACHE_SWITCH == 'off' || cache.miss(data)) {
        try {
            let response = await request.postAsync(`http://${HOST}/initEquip`, { form: info });
            if (window.POI_VERSION >= 'v8.0.0')
                response = response[0];
            let status = response.statusCode, repData = response.body;
            if (status >= 300)
                console.log(status, response.statusMessage);
            if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
                console.log(`initEquip.action response: ${repData}`);
            cache.put(data);
        } catch (err) {
            console.error(err);
        }
    }
    return;
};

const reportInitEquipByRemodel = async () => {
    if (_remodelShips.length == 0) return;
    let data = {};
    for (let apiId of _remodelShips) {
        apiId = parseInt(apiId);
        let ship = _ships[apiId];
        data[ship] = ship.api_slot.filter(slot => slot != -1).map(slot => _slotitems[slot].api_sortno);
    }
    if (CACHE_SWITCH == 'off' || cache.miss(data)) {
        try {
            let response = await request.postAsync(`http://${HOST}/initEquip`, { form: { ships: data } });
            if (window.POI_VERSION >= 'v8.0.0')
                response = response[0];
            let status = response.statusCode, repData = response.body;
            if (status >= 300)
                console.log(status, response.statusMessage);
            if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
                console.log(`initEquip.action response:  ${repData}`);
            cache.put(data);
        } catch (err) {
            console.error(err);
        }
    }
    _remodelShips = [];
};

// Report tyku data
const reoprtTyku = async (eSlot, eKouku, detail, seiku, dock_id, ship_id) => {
    let { rank, map, mapCell, dropShipId, deckShipId } = detail;
    let { _teitokuLv, _nickName, _nickNameId, _decks } = window;
    if (deckShipId.length > 6) combined = true;
    let { maxTyku, minTyku } = getTyku(_decks[dock_id - 1]);
    if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
        console.log(`Tyku value: ${minTyku}, ${maxTyku}`);
    let { api_no, api_maparea_id } = $maps[map];
    //-1=数据缺失, 0=制空均衡, 1=制空権確保, 2=航空優勢, 3=航空劣勢, 4=制空権喪失
    let info = {
        mapAreaId: +api_maparea_id,
        mapId: +api_no,
        cellId: +mapCell,
        minTyku: minTyku,
        maxTyku: maxTyku,
        rank: rank,
        seiku: seiku,
        shipId: ship_id,
        version: '3.0.0-bata.0'
    };
    if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
        console.log(JSON.stringify(info));
    if (CACHE_SWITCH == 'off' || cache.miss(info)) {
        try {
            let response = await request.postAsync(`http://${HOST}/tyku`, { form: info });
            if (window.POI_VERSION >= 'v8.0.0')
                response = response[0];
            let status = response.statusCode, repData = response.body;
            if (status >= 300)
                console.log(status, response.statusMessage);
            if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
                console.log(`Tyku api response: ${repData}`);
            cache.put(info);
        } catch (err) {
            console.error(err);
        }
    }
    return;
};

// Report fleets and mapinfos
const reportBattle = async (mapinfo_no, maparea_id, cell_ids, _decks, dock_id, _ships) => {
    if (mapinfo_no == 1 && maparea_id == 1) return;
    let ships = [];
    for (let ship_id of _decks[dock_id].api_ship) {
        if (ship_id != -1)
            ships.push(_ships[ship_id].api_ship_id);
        else
            ships.push(-1);
    }
    if (!cell_ids || cell_ids.length == 0) return;
    let info = {
        mapAreaId: +maparea_id,
        mapId: +mapinfo_no,
        cellId: cell_ids,
        ships: ships,
        version: '3.0.8'
    };
    if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
        console.log(JSON.stringify(info));
    if (CACHE_SWITCH == 'off' || cache.miss(info)) {
        try {
            let response = await request.postAsync(`http://${HOST}/expedition`, { form: info });
            if (window.POI_VERSION >= 'v8.0.0')
                response = response[0];
            let status = response.statusCode, repData = response.body;
            if (status >= 300)
                console.log(status, response.statusMessage);
            if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
                console.log(`battle.action response:  ${repData}`);
            cache.put(info);
        } catch (err) {
            console.error(err);
        }
    }
};

// Report fleets and mapinfos
const reportBattleV2 = async (mapinfo_no, maparea_id, mapLevels, mapGauges, cellData, dock_id, enemyData, dropData, combinedFlag) => {
    if (_.isUndefined(combinedFlag) || combinedFlag < 0) combinedFlag = 0;
    if (!cellData || cellData.length == 0) return;
    if (__decks.length === 0) return;

    let info = {
        mapAreaId: maparea_id,
        mapId: mapinfo_no,
        mapLevel: mapLevels[maparea_id * 10 + mapinfo_no],
        mapGauge: mapGauges[maparea_id * 10 + mapinfo_no],
        cellData: cellData,
        decks: __decks,
        deckId: dock_id,
        teitokuId: _teitokuId,
        teitokuLevel: _teitokuLv,
        nickName: _nickName,
        enemyData: enemyData,
        dropData: dropData,
        combinedFlag: combinedFlag,
        version: '3.1.2'
    };

    if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
        console.log(JSON.stringify(info));

    try {
        let response = await request.postAsync(`http://${HOST_V2}/statistic/sortie`, {
            body: JSON.stringify(info),
            json: true,
        });
        if (window.POI_VERSION >= 'v8.0.0')
            response = response[0];
        let status = response.statusCode, repData = response.body;
        if (status >= 300)
            console.log(status, response.statusMessage);
        if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
            console.log(`battle.action response:  ${repData}`);
    } catch (err) {
        console.error(err);
    }
};

const reportFrindly = async (body) => {
    if (cache.miss(body)) {
        let response = await request.postAsync(`http://${HOST_V3}/api/report/friendly_info`, { body, json: true });

        if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
            console.log(`friendly.action response: ${repData}`);
        cache.put(body);
    }
}

const reportAirBaseAttack = async (body) => {
    if (cache.miss(body)) {
        let response = await request.postAsync(`http://${HOST_V3}/api/report/air_base_attack`, { body, json: true });

        if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
            console.log(`airbaseattack.action response: ${repData}`);
        cache.put(body);
    }
}

const reportNextWayV2 = async (body) => {
    if (cache.miss(body)) {
        let response = await request.postAsync(`http://${HOST_V3}/api/report/next_way_v2`, { body, json: true });

        if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
            console.log(`nextway.action response: ${repData}`);
        cache.put(body);
    }
}

const reportQuest = async (body) => {
    if (cache.miss(body)) {
        let response = await request.postAsync(`http://${HOST_V3}/api/report/quest`, { body, json: true });

        if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
            console.log(`quest.action response: ${repData}`);
        cache.put(body);
    }
}

const reportBattleDetail = async (body) => {
    if (cache.miss(body)) {
        let response = await request.postAsync(`http://${HOST_V3}/api/report/battle`, { body, json: true });

        if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
            console.log(`battle.action response: ${repData}`);
        cache.put(body);
    }
}

const cacheSync = () => {
    fs.ensureDirSync(join(APPDATA_PATH, 'kcwiki-report'));
    let data = JSON.stringify(cache.raw());
    if (data.length > 1000000) cache.clear();
    fs.writeFileAsync(CACHE_FILE, data, (err) => {
        if (err) console.error(JSON.stringify(err));
        if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
            console.log("Cache Sync Done.");
        return;
    })
};

const getDeckWhenMapStart = (_decks, _ships, _slotitems) => {
    let decks = [];
    for (let deck of _decks) {
        // get deck detail info
        let ships = [];
        for (let ship_id of deck.api_ship) {
            // get ship detail data
            if (ship_id !== -1) {
                let ship = _ships[ship_id];
                let slots = [];
                let exslot = {};
                if (!ship)
                    continue;

                for (let slot_id of ship.api_slot) {
                    // get slot detail data
                    if (slot_id !== -1) {
                        let slot = _slotitems[slot_id];
                        if (!slot)
                            continue;
                        slots.push({
                            api_slotitem_id: slot.api_slotitem_id,
                            api_level: slot.api_level,
                            api_alv: slot.api_alv ? slot.api_alv : 0,
                        });
                    }
                }

                // exslot
                if (ship.api_slot_ex > 0) {
                    let slot = _slotitems[ship.api_slot_ex];
                    exslot = {
                        api_slotitem_id: slot.api_slotitem_id,
                        api_level: slot.api_level,
                        api_alv: slot.api_alv ? slot.api_alv : 0,
                    };
                } else {
                    exslot = {
                        api_slotitem_id: -1,
                        api_level: 0,
                        api_alv: 0
                    };
                }

                ships.push({
                    api_ship_id: ship.api_ship_id,
                    api_lv: ship.api_lv,
                    api_soku: ship.api_soku,
                    slots: slots,
                    exslot: exslot,
                    api_cond: ship.api_cond,
                });
            }
        }

        decks.push({
            api_id: deck.api_id,
            api_name: deck.api_name,
            api_mission: deck.api_mission,
            tyku: getTykuV2(deck),
            saku25: getSaku25(deck),
            saku25a: getSaku25a(deck),
            saku33x1: getSaku33(deck, 1),
            saku33x3: getSaku33(deck, 3),
            saku33x4: getSaku33(deck, 4),
            ships: ships,
        });
    }
    return decks;
};

const whenMapStart = (_decks, _ships, _slotitems) => {
    combined = false;
    _path = [];
    __ships = JSON.parse(JSON.stringify(_ships));
    __decks = getDeckWhenMapStart(_decks, _ships, _slotitems);
};

const whenBattleResult = (_decks, _ships) => {
    let decks = [];
    _decks.map(v => {
        decks = decks.concat(v.api_ship);
    });
    lvs = decks.map(deck => {
        if (deck == -1)
            return -1
        return _ships[deck].api_lv
    }) || [];
    if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
        console.log(JSON.stringify(lvs));
};

const whenRemodel = (body) => {
    _remodelShips.push(body.api_id);
};

export {
    reportInit,
    reportGetLoseItem,
    reportEnemy,
    reportShipAttrByLevelUp,
    reportShipAttr,
    reoprtTyku,
    reportInitEquipByBuild,
    reportInitEquipByDrop,
    reportInitEquipByRemodel,
    reportBattle,
    reportBattleV2,
    reportFrindly,
    reportAirBaseAttack,
    reportNextWayV2,
    reportQuest,
    reportBattleDetail,
    whenBattleResult,
    whenMapStart,
    whenRemodel,
    cacheSync
};
