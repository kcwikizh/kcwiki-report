// Tyku
// 制空値= ∑ [艦載機の対空値 x √(搭載数) + √(熟練値/10) + 机种制空加值 ] ( [ ] 方括号代表取整)
const aircraftExpTable = [0, 10, 25, 40, 55, 70, 85, 100, 121];
const aircraftLevelBonus = {
    '6': [0, 0, 2, 5, 9, 14, 14, 22, 22],   // 艦上戦闘機
    '7': [0, 0, 0, 0, 0, 0, 0, 0, 0],       // 艦上爆撃機
    '8': [0, 0, 0, 0, 0, 0, 0, 0, 0],       // 艦上攻撃機
    '11': [0, 1, 1, 1, 1, 3, 3, 6, 6],      // 水上爆撃機
    '45': [0, 0, 2, 5, 9, 14, 14, 22, 22],  // 水上戦闘機
    '47': [0, 0, 0, 0, 0, 0, 0, 0, 0],      // 陸上攻撃機
    '48': [0, 0, 2, 5, 9, 14, 14, 22, 22],  // 局地戦闘機 陸軍戦闘機
    '56': [0, 0, 0, 0, 0, 0, 0, 0, 0],      // 噴式戦闘機
    '57': [0, 0, 0, 0, 0, 0, 0, 0, 0],      // 噴式戦闘爆撃機
    '58': [0, 0, 0, 0, 0, 0, 0, 0, 0],      // 噴式攻撃機
};

const getTyku = (deck) => {
    let minTyku = 0;
    let maxTyku = 0;
    let { $ships, $slotitems, _ships, _slotitems } = window;
    for (let shipId of deck.api_ship) {
        if (shipId == -1)
            continue;
        let ship = _ships[shipId];
        for (let slotId in ship.api_slot) {
            let itemId = ship.api_slot[slotId];
            if (itemId == -1 || typeof _slotitems[itemId] === "undefined" || _slotitems[itemId] === null)
                continue;
            let _item = _slotitems[itemId];
            let $item = $slotitems[_item.api_slotitem_id];
            let tempTyku = 0.0;
            let tempAlv;
            // Basic tyku
            if (_item.api_alv) {
                tempAlv = +_item.api_alv;
            } else {
                tempAlv = 0;
            }
            if ([6, 7, 8].includes($item.api_type[3])) {
                // 艦载機
                tempTyku += Math.sqrt(ship.api_onslot[slotId]) * ($item.api_tyku + (_item.api_level || 0) * 0.2);
                tempTyku += aircraftLevelBonus[$item.api_type[3]][tempAlv];
                minTyku += Math.floor(tempTyku + Math.sqrt(aircraftExpTable[tempAlv] / 10));
                maxTyku += Math.floor(tempTyku + Math.sqrt(aircraftExpTable[tempAlv + 1] / 10));
            } else if ($item.api_type[3] == 10 && ($item.api_type[2] == 11 || $item.api_type[2] == 45)) {
                // 水上機
                tempTyku += Math.sqrt(ship.api_onslot[slotId]) * $item.api_tyku;
                tempTyku += aircraftLevelBonus[$item.api_type[2]][tempAlv];
                minTyku += Math.floor(tempTyku + Math.sqrt(aircraftExpTable[tempAlv] / 10));
                maxTyku += Math.floor(tempTyku + Math.sqrt(aircraftExpTable[tempAlv + 1] / 10));
            }
        }
    }
    return {
        minTyku: minTyku,
        maxTyku: maxTyku,
    }
};

const getTykuV2 = (deck) => {
    let { $slotitems, _ships, _slotitems } = window;
    let minTyku = 0;
    let maxTyku = 0;
    let basicTyku = 0;
    let reconBonus = 1;
    for (let shipId of deck.api_ship) {
        if (shipId === -1)
            continue;
        let ship = _ships[shipId];
        if (!ship)
            continue;
        for (let i = 0; i < ship.api_slot.length; i++) {
            let slotId = ship.api_slot[i];
            if (slotId === -1)
                continue;
            let _equip = _slotitems[slotId];
            if (!_equip)
                continue;
            let onslot = ship.api_onslot[i];
            if (onslot == undefined || onslot <= 0)
                continue;
            let $equip = $slotitems[_equip.api_slotitem_id];
            let tempTyku = 0.0;
            let tempAlv = _equip.api_alv ? _equip.api_alv : 0;

            // 改修：艦戦×0.2、爆戦×0.25
            const levelFactor = $equip.api_baku > 0 ? 0.25 : 0.2;
            if ([6, 7, 8, 45, 47, 56, 57, 58].includes($equip.api_type[2])) {
                // 艦载機 · 水上戦闘機 · 陸上攻撃機 · 噴式機
                tempTyku += Math.sqrt(onslot) * ($equip.api_tyku + (_equip.api_level || 0) * levelFactor);
                tempTyku += aircraftLevelBonus[$equip.api_type[2]][tempAlv];
                basicTyku += Math.floor(Math.sqrt(onslot) * $equip.api_tyku);
                minTyku += Math.floor(tempTyku + Math.sqrt(aircraftExpTable[tempAlv] / 10));
                maxTyku += Math.floor(tempTyku + Math.sqrt((aircraftExpTable[tempAlv + 1] - 1) / 10));
            } else if ([11].includes($equip.api_type[2])) {
                // 水上爆撃機
                tempTyku += Math.sqrt(onslot) * $equip.api_tyku;
                tempTyku += aircraftLevelBonus[$equip.api_type[2]][tempAlv];
                basicTyku += Math.floor(Math.sqrt(onslot) * $equip.api_tyku);
                minTyku += Math.floor(tempTyku + Math.sqrt(aircraftExpTable[tempAlv] / 10));
                maxTyku += Math.floor(tempTyku + Math.sqrt((aircraftExpTable[tempAlv + 1] - 1) / 10));
            } else if ([48].includes($equip.api_type[2])) {
                // 局戦 · 陸戦
                let landbaseBonus = 0;
                // if (landbaseStatus === 1) landbaseBonus = 1.5 * $equip.api_houk; // (対空 ＋ 迎撃 × 1.5)
                // if (landbaseStatus === 2) landbaseBonus = $equip.api_houk + 2 * $equip.api_houm; // (対空 ＋ 迎撃 ＋ 対爆 × 2)
                tempTyku += Math.sqrt(onslot) * ($equip.api_tyku + landbaseBonus + (_equip.api_level || 0) * levelFactor);
                tempTyku += aircraftLevelBonus[$equip.api_type[2]][tempAlv];
                basicTyku += Math.floor(Math.sqrt(onslot) * $equip.api_tyku);
                minTyku += Math.floor(tempTyku + Math.sqrt(aircraftExpTable[tempAlv] / 10));
                maxTyku += Math.floor(tempTyku + Math.sqrt((aircraftExpTable[tempAlv + 1] - 1) / 10));
            } else if ([10, 41].includes($equip.api_type[2])) {
                // 水偵・飛行艇
            } else if ([9].includes($equip.api_type[2]) /** && landbaseStatus == 2 */) {
                // 艦偵
            }
        }
    }
    return {
        basic: Math.floor(basicTyku * reconBonus),
        min: Math.floor(minTyku * reconBonus),
        max: Math.floor(maxTyku * reconBonus),
    };
};

// Saku (2-5 旧式)
// 偵察機索敵値×2 ＋ 電探索敵値 ＋ √(艦隊の装備込み索敵値合計 - 偵察機索敵値 - 電探索敵値)
const getSaku25 = (deck) => {
    let { $slotitems, _ships, _slotitems } = window;
    let reconSaku = 0;
    let shipSaku = 0;
    let radarSaku = 0;
    let totalSaku = 0;
    for (let shipId of deck.api_ship) {
        if (shipId === -1)
            continue;
        let ship = _ships[shipId];
        if (!ship)
            continue;

        shipSaku += ship.api_sakuteki[0];
        for (let i = 0; i < ship.api_slot.length; i++) {
            let slotId = ship.api_slot[i];
            if (slotId === -1)
                continue;
            let _equip = _slotitems[slotId];
            if (!_equip)
                continue;
            let $equip = $slotitems[_equip.api_slotitem_id];
            switch ($equip.api_type[3]) {
                case 9:
                    reconSaku += $equip.api_saku;
                    shipSaku -= $equip.api_saku;
                    break;
                case 10:
                    if ($equip.api_type[2] == 10) {
                        reconSaku += $equip.api_saku;
                        shipSaku -= $equip.api_saku;
                    }
                    break;
                case 11:
                    radarSaku += $equip.api_saku;
                    shipSaku -= $equip.api_saku;
                    break;
                default:
                    break;
            }
        }
    }
    reconSaku = reconSaku * 2.00;
    shipSaku = Math.sqrt(shipSaku);
    totalSaku = reconSaku + radarSaku + shipSaku;

    return {
        recon: parseFloat(reconSaku.toFixed(2)),
        radar: parseFloat(radarSaku.toFixed(2)),
        ship: parseFloat(shipSaku.toFixed(2)),
        total: parseFloat(totalSaku.toFixed(2)),
    };
};

// Saku (2-5 秋式)
// 索敵スコア = 艦上爆撃機 × (1.04) + 艦上攻撃機 × (1.37) + 艦上偵察機 × (1.66) + 水上偵察機 × (2.00)
//            + 水上爆撃機 × (1.78) + 小型電探 × (1.00) + 大型電探 × (0.99) + 探照灯 × (0.91)
//            + √(各艦毎の素索敵) × (1.69) + (司令部レベルを5の倍数に切り上げ) × (-0.61)
const getSaku25a = (deck) => {
    let { $slotitems, _ships, _slotitems, _teitokuLv } = window;
    let totalSaku = 0;
    let shipSaku = 0;
    let equipSaku = 0;
    let teitokuSaku = 0;
    for (let shipId of deck.api_ship) {
        if (shipId === -1)
            continue;
        let ship = _ships[shipId];
        if (!ship)
            continue;

        let shipPureSaku = ship.api_sakuteki[0];
        for (let i = 0; i < ship.api_slot.length; i++) {
            let slotId = ship.api_slot[i];
            if (slotId === -1)
                continue;
            let _equip = _slotitems[slotId];
            if (!_equip)
                continue;
            let $equip = $slotitems[_equip.api_slotitem_id];

            shipPureSaku -= $equip.api_saku;
            switch ($equip.api_type[3]) {
                case 7:
                    equipSaku += $equip.api_saku * 1.04;
                    break;
                case 8:
                    equipSaku += $equip.api_saku * 1.37;
                    break;
                case 9:
                    equipSaku += $equip.api_saku * 1.66;
                    break;
                case 10:
                    if ($equip.api_type[2] == 10)
                        equipSaku += $equip.api_saku * 2.00;
                    else if ($equip.api_type[2] == 11)
                        equipSaku += $equip.api_saku * 1.78;
                    break;
                case 11:
                    if ($equip.api_type[2] == 12)
                        equipSaku += $equip.api_saku * 1.00;
                    else if ($equip.api_type[2] == 13)
                        equipSaku += $equip.api_saku * 0.99;
                    break;
                case 24:
                    equipSaku += $equip.api_saku * 0.91;
                    break;
                default:
                    break;
            }
        }
        shipSaku += Math.sqrt(shipPureSaku) * 1.69;
    }
    teitokuSaku = 0.61 * Math.floor((_teitokuLv + 4) / 5) * 5;
    totalSaku = shipSaku + equipSaku - teitokuSaku;

    return {
        ship: parseFloat(shipSaku.toFixed(2)),
        item: parseFloat(equipSaku.toFixed(2)),
        teitoku: parseFloat(teitokuSaku.toFixed(2)),
        total: parseFloat(totalSaku.toFixed(2)),
    };
}

// Saku (33)
// 索敵スコア = Sigma(CiSi) + Sigma(sqrt(s)) - Ceil(0.4H) + 2M
//     Si(改修): 電探(1.25 * Sqrt(Star)) 水上偵察機(1.2 * Sqrt(Star))
//     Ci(装備):
//              6 0.6 艦上戦闘機
//              7 0.6 艦上爆撃機
//              8 0.8 艦上攻撃機
//              9 1.0 艦上偵察機
//             10 1.2 水上偵察機
//             11 1.1 水上爆撃機
//             12 0.6 小型電探
//             13 0.6 大型電探
//             26 0.6 対潜哨戒機
//             29 0.6 探照灯
//             34 0.6 司令部施設
//             35 0.6 航空要員
//             39 0.6 水上艦要員
//             40 0.6 大型ソナー
//             41 0.6 大型飛行艇
//             42 0.6 大型探照灯
//             45 0.6 水上戦闘機
//             93 大型電探(II) null
//             94 艦上偵察機(II) null
//     S(各艦毎の素索敵)
//     H(レベル)
//     M(空き数)
const getSaku33 = (deck, mapModifier) => {
    let { $slotitems, _ships, _slotitems, _teitokuLv } = window;
    let totalSaku = 0;
    let shipSaku = 0;
    let equipSaku = 0;
    let teitokuSaku = 0;
    let emptySlot = deck.api_ship.length;
    for (let shipId of deck.api_ship) {
        if (shipId === -1)
            continue;
        let ship = _ships[shipId];
        if (!ship)
            continue;

        emptySlot -= 1;
        let shipPureSaku = ship.api_sakuteki[0];
        for (let i = 0; i < ship.api_slot.length; i++) {
            let slotId = ship.api_slot[i];
            if (slotId === -1)
                continue;
            let _equip = _slotitems[slotId];
            if (!_equip)
                continue;
            let $equip = $slotitems[_equip.api_slotitem_id];

            shipPureSaku -= $equip.api_saku;
            switch ($equip.api_type[2]) {
                case 8:
                    equipSaku += $equip.api_saku * 0.8;
                    break;
                case 9:
                    equipSaku += $equip.api_saku * 1.0;
                    break;
                case 10:
                    equipSaku += ($equip.api_saku + 1.2 * Math.sqrt(_equip.api_level || 0)) * 1.2;
                    break;
                case 11:
                    equipSaku += $equip.api_saku * 1.1;
                    break;
                case 12:
                    equipSaku += ($equip.api_saku + 1.25 * Math.sqrt(_equip.api_level || 0)) * 0.6;
                    break;
                case 13:
                    equipSaku += ($equip.api_saku + 1.25 * Math.sqrt(_equip.api_level || 0)) * 0.6;
                    break;
                default:
                    equipSaku += $equip.api_saku * 0.6;
                    break;
            }
        }
        shipSaku += Math.sqrt(shipPureSaku);
    }
    equipSaku *= mapModifier;
    teitokuSaku = Math.ceil(_teitokuLv * 0.4);
    totalSaku = shipSaku + equipSaku - teitokuSaku + 2 * emptySlot;

    return {
        ship: parseFloat(shipSaku.toFixed(2)),
        item: parseFloat(equipSaku.toFixed(2)),
        teitoku: parseFloat(teitokuSaku.toFixed(2)),
        total: parseFloat(totalSaku.toFixed(2)),
    };
}

class HashTable {
    data;
    constructor(raw) {
        if (typeof raw == "object") this.data = raw;
    }
    miss(key) {
        return typeof this.data[this.hash(key)] === "undefined" || this.data[this.hash(key)] === null;
    }
    put(obj) {
        this.data[this.hash(obj)] = true;
    }
    hash(obj) {
        return hashCode(JSON.stringify(obj));
    }
    clear() {
        this.data = {};
    }
    raw() {
        return this.data;
    }
}

const sum = arr => arr.reduce((total, item) => total + item, 0);

const hashCode = val => val.split('').reduce((h, ch) => {
    if (typeof h == "string") h = h.charCodeAt(0);
    h = ((h << 5) - h) + ch.charCodeAt(0);
    h |= 0;
    return h;
}, 0);

export {
    getTyku,
    getTykuV2,
    getSaku25,
    getSaku25a,
    getSaku33,
    sum,
    hashCode,
    HashTable
};
