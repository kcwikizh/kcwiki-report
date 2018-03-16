// Tyku
// 制空値= ∑ [艦載機の対空値 x √(搭載数) + √(熟練値/10) + 机种制空加值 ] ( [ ] 方括号代表取整)
const aircraftExpTable = [0, 10, 25, 40, 55, 70, 85, 100, 121];
const aircraftLevelBonus = {
    '6': [0, 0, 2, 5, 9, 14, 14, 22, 22],   // 艦上戦闘機
    '7': [0, 0, 0, 0, 0, 0, 0, 0, 0],       // 艦上爆撃機
    '8': [0, 0, 0, 0, 0, 0, 0, 0, 0],       // 艦上攻撃機
    '11': [0, 1, 1, 1, 1, 3, 3, 6, 6],      // 水上爆撃機
    '45': [0, 0, 2, 5, 9, 14, 14, 22, 22],  // 水上戦闘機
};

const getTyku = (deck) => {
    let minTyku = 0;
    let maxTyku = 0;
    let {$ships, $slotitems, _ships, _slotitems} = window;
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

const sum = arr => arr.reduce((total,item) => total + item, 0);

const hashCode = val => val.split('').reduce((h,ch) => {
    if (typeof h == "string") h = h.charCodeAt(0);
    h = ((h<<5)-h)+ch.charCodeAt(0);
    h |= 0;
    return h;
}, 0);

export {
    getTyku,
    sum,
    hashCode,
    HashTable
};
