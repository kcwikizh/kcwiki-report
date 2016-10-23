var { _, SERVER_HOSTNAME, APPDATA_PATH } = window;
if (_ == undefined) {
    try {
        _ = require('lodash');
    } catch(err) {
        _ = require('underscore');
    }
}
Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs-extra'));
var request = Promise.promisifyAll(require('request'),{multiArgs: true});

import { getTyku, sum, hashCode, HashTable } from './common';
import path from 'path';
var KCWIKI_HOST = 'api.kcwiki.moe';
var CACHE_FILE = path.join(APPDATA_PATH, 'kcwiki-report', 'cache.json');
var HOST = KCWIKI_HOST;
var CACHE_SWITCH = 'on';

var drops= [], lvs = [], _path = [], __ships = {}, _remodelShips = [], _map = '',
    _mapId = 0, _mapAreaId = 0, combined = false, cache = new HashTable({});

fs.readFile(CACHE_FILE, (err, data) => {
    if (typeof err == "undefined" || err == null) cache = new HashTable(JSON.parse(data));
    if (typeof err !== "undefined" && err !== null && err.code == 'ENOENT') console.log('Kcwiki reporter cache file not exist, will touch new one soon.');
    if (typeof err !== "undefined" && err !== null && err.code && err.code != 'ENOENT') console.error(err.code);
});

var reportInit = ()=> {
    drops = [];
    lvs = [];
    _path = [];
    __ships = {};
    _map = '';
    _mapId = 0;
    _mapAreaId = 0;
    combined = false;
};

// Report map event (etc. get resource)
var reportGetLoseItem = async (body) => {
    _map = '' + body.api_maparea_id + body.api_mapinfo_no;
    _mapAreaId = body.api_maparea_id;
    _mapId = body.api_mapinfo_no;
    _path.push(body.api_no);
    // Report getitem data
    if (typeof body.api_itemget !== "undifined" && body.api_itemget !== null) {
        // Item ID: 1 油 2 弹
        info = {
            mapAreaId: +_mapAreaId,
            mapId: +_mapId,
            cellId: +body.api_no,
            eventId: +body.api_itemget.api_id,
            count: +body.api_itemget.api_getcount,
            eventType: 0
        };
        if (typeof process.env.DEBUG !== "undifined" && process.env.DEBUG !== null)
            console.log(JSON.stringify(info));
        if (cache.miss(info)) {
            [response, repData] = await request.postAsync("http://#{HOST}/mapEvent",
                form = info);
            if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null) console.log("getitem.action response: #{repData}");
            cache.put(info);
        }
    }
    //Report dropitem data
    if (typeof body.api_happening !== "undefined" && body.api_happening !==null && body.api_happening.api_type == 1) {
        // Bullet - Type:1 IconId:2
        // Fuel - Type:1 IconId:1
        info = {
            mapAreaId: +_mapAreaId,
            mapId: +_mapId,
            cellId: +body.api_no,
            eventId: +body.api_happening.api_icon_id,
            count: +body.api_happening.api_count,
            dantan: body.api_happening.dantan,
            eventType: 1
        };
        if (process.env.DEBUG) console.log(JSON.stringify(info));
        if (cache.miss(info)) {
            [response, repData] = await request.postAsync("http://#{HOST}/mapEvent",
                form = info);
            if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null) console.log("dropitem.action response: #{repData}");
            cache.put(info);
        }
    }
    return;
};

// Report enemy fleet data
var reportEnemy = async (body) => {
    info = {
        enemyId: body.api_ship_ke.slice(1),
        maxHP: body.api_maxhps.slice(7),
        slots: body.api_eSlot,
        param: body.api_eParam,
        mapId: _mapId,
        mapAreaId: _mapAreaId,
        cellId: _path.slice(-1)[0]
    };
    if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null) console.log(JSON.stringify(info));
    if (CACHE_SWITCH == 'off' || cache.miss(info)) {
        try {
            [response, repData] = await request.postAsync("http://#{HOST}/enemy",
                form = info);
            if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null) console.log("enemy.action response: #{repData}");
            cache.put(info);
        } catch (err) {
            console.log(err);
        }
    }
};

// Report ship attributes
var reportShipAttr = async (path) => {
    let { _ships, _decks, _teitokuLv, _slotitems } = window._slotitems;
    if ('port' in path) drops = [];
    if (lvs.length != 0) {
        decks = (_decks[0].api_ship.concat(_decks[1].api_ship));
        lvsNew = decks.filter(deck => deck != -1).forEach(deck => _ships[deck].api_lv);
        data = [];
        for (let [lv, i] in lvs) {
            if (lv == lvsNew[i]) continue;
            ship = _ships[decks[i]];
            slots = ship.api_slot;
            luck = ship.api_luck[0]; // 運
            kaihi = ship.api_kaihi[0]; // 回避
            sakuteki = ship.api_sakuteki[0] - sum(slots.filter(slot=>slot != -1).forEach(slot => _slotitems[slot].api_saku));// 索敵
            taisen = ship.api_taisen[0] - sum(slots.filter(slot => slot != -1).forEach(slot=>_slotitems[slot].api_tais));// 対潜
            info = {
                sortno: +ship.api_sortno,
                luck: +luck,
                sakuteki: +sakuteki,
                taisen: +taisen,
                kaihi: +kaihi,
                level: +lvsNew[i]
            };
            if (CACHE_SWITCH == 'off' || cache.miss(info)) {
                try {
                    [response, repData] = await request.postAsync("http://#{HOST}/shipAttr",
                        form = info);
                    if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
                        console.log("attr.action response: #{repData}");
                    cache.put(info);
                } catch (err) {
                    console.log(err);
                }
            }
        }
        lvs = [];
    }
};

// Report initial equip data
var reportInitEquipByDrop = async (_ships) => {
    if (_.keys(__ships).length != 0) {
        _newShips = {};
        _keys = _.keys(_ships);
        __keys = _.keys(__ships);
        _newKeys = _.difference(_keys,__keys);
        if (_newKeys.length > 0) {
            for (let key in _newKeys)
                _newShips[_ships[key].api_sortno] = _ships[key].api_slot;
            for (let [shipno,slots] of _newShips)
                _newShips[shipno] = slots.filter(slot=>slot!=-1).forEach(slot=> _slotitems[slot].api_sortno);
            info = {
                ships: _newShips
            };
            __ships = {};
            if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
                console.log(JSON.stringify(info));
            if (CACHE_SWITCH == 'off' || cache.miss(_newShips)) {
                try {
                    [response, repData] = await request.postAsync("http://#{HOST}/initEquip",
                        form = info);
                    if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
                        console.log("initEquip.action response: #{repData}");
                    cache.put(_newShips);
                } catch (err) {
                    console.log(err);
                }
            }
        }
    }
    return;
};

// Report initial equip data
var reportInitEquipByBuild = async (body, _ships) => {
    ship = _ships[body.api_ship.api_id];
    slots = ship.api_slot.filter(slot => slot!=-1).forEach(slot=>_slotitems[slot].api_sortno);
    data = {};
    data[ship.api_sortno] = slots;
    info = {
        ships: data
    };
    if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
        console.log(JSON.stringify(info));
    if (CACHE_SWITCH == 'off' || cache.miss(data)) {
        try {
            [response, repData] = await request.postAsync("http://#{HOST}/initEquip",
                form = info);
            if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
                console.log("initEquip.action response: #{repData}");
            cache.put(data);
        } catch (err) {
            console.log(err);
        }
    }
    return;
};

var reportInitEquipByRemodel = async () => {
    if (_remodelShips.length == 0) return;
    data = {};
    for (let apiId in _remodelShips) {
        ship = _ships[apiId];
        data[ship] = ship.api_slot.filter(slot=> slot != -1).forEach(slot=>_slotitems[slot].api_sortno);
    }
    if (CACHE_SWITCH == 'off' || cache.miss(data)) {
        try {
            [response, repData] = await request.postAsync("http://#{HOST}/initEquip",
                {form: {ships: data}});
            if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
                console.log("initEquip.action response:  #{repData}");
            cache.put(data);
        } catch (err) {
            console.log(err);
        }
    }
    _remodelShips = [];
};

// Report path data
var reportPath = async (_decks) => {
    if (_path.length != 0) {
        decks = [];
        decks[0] = _decks[0].api_ship.filter(shipId=>shipId != -1).forEach(shipId=>_ships[shipId].api_sortno);
        if (combined)
            decks[1] = _decks[1].api_ship.filter(shipId=>shipId != -1).forEach(shipId=>_ships[shipId].api_sortno);
        info = {
            path: _path,
            decks: decks,
            mapId: +_mapId,
            mapAreaId: +_mapAreaId
        };
        if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
            console.log(JSON.stringify(info));
        if (CACHE_SWITCH == 'off' || cache.miss(info)) {
            try {
                [response, repData] = await request.postAsync("http://#{HOST}/path",
                    {form: info});
                if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
                    console.log("path.action response: #{repData}");
                cache.put(info);
            } catch (err) {
                console.log(err);
            }
        }
    }
    return;
};

// Report tyku data
var reoprtTyku = async (detail) => {
    let {rank, map, mapCell, dropShipId, deckShipId} = detail;
    let {_teitokuLv, _nickName, _nickNameId, _decks} = window;
    if (deckShipId.length > 6) combined = true;
    tyku = getTyku(_decks[0]).min;
    if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
        console.log("Tyku value: #{tyku}");
    if (tyku == 0) return;
    let {api_no, api_maparea_id} = $maps[map];
    info = {
        mapAreaId: +api_maparea_id,
        mapId: +api_no,
        cellId: +mapCell,
        tyku: tyku,
        rank: rank,
        version: '2.0.1'
    };
    if (CACHE_SWITCH == 'off' || cache.miss(info)) {
        try {
            [response, repData] = await request.postAsync("http://#{HOST}/tyku",
                {form: info});
            if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
                console.log("Tyku api response: #{repData}");
            cache.put(info);
        } catch (err) {
            console.log(err);
        }
    }
    return;
};

var cacheSync = () => {
    fs.ensureDirSync(path.join(APPDATA_PATH, 'kcwiki-report'));
    data = JSON.stringify(cache.raw());
    if (data.length > 1000000) cache.clear();
    fs.writeFileAsync(CACHE_FILE, data, (err) => {
        if (err) console.error(JSON.stringify(err));
        if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
            console.log("Cache Sync Done.");
        return;
    })
};

var whenMapStart = (_ships) => {
    combined = false;
    _path = [];
    __ships = JSON.parse(JSON.stringify(_ships));
};

var whenBattleResult = (_decks, _ships) => {
    decks = [];
    decks = (_decks[0].api_ship.concat(_decks[1].api_ship));
    lvs = decks.filter(deck=>deck != -1).forEach(deck=>_ships[deck].api_lv);
    if (typeof process.env.DEBUG !== "undefined" && process.env.DEBUG !== null)
        console.log(JSON.stringify(lvs));
};

var whenRemodel = (body) => {
    _remodelShips.push(body.api_id);
};

module.exports = {
    reportInit: reportInit,
    reportGetLoseItem: reportGetLoseItem,
    reportEnemy: reportEnemy,
    reportPath: reportPath,
    reportShipAttr: reportShipAttr,
    reoprtTyku: reoprtTyku,
    reportInitEquipByBuild: reportInitEquipByBuild,
    reportInitEquipByDrop: reportInitEquipByDrop,
    reportInitEquipByRemodel: reportInitEquipByRemodel,
    whenBattleResult: whenBattleResult,
    whenMapStart: whenMapStart,
    whenRemodel: whenRemodel,
    cacheSync: cacheSync
};