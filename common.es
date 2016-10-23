// Tyku
// 制空値= ∑ [艦載機の対空値 x √(搭載数) + √(熟練値/10) + 机种制空加值 ] ( [ ] 方括号代表取整)
var aircraftExpTable = [0, 10, 25, 40, 55, 70, 85, 100, 121];
var aircraftLevelBonus = {
  '6': [0, 0, 2, 5, 9, 14, 14, 22, 22],
  '7': [0, 0, 0, 0, 0, 0, 0, 0, 0],
  '8': [0, 0, 0, 0, 0, 0, 0, 0, 0],
  '11': [0, 1, 1, 1, 1, 3, 3, 6, 6],
  '45': [0, 0, 0, 0, 0, 0, 0, 0, 0]
};
const getTyku = (deck) => {
    let {$ships, $slotitems, _ships, _slotitems} = window;
    let minTyku = 0, maxTyku = 0;
    for (let shipId in deck.api_ship) {
        if (shipId == -1) continue;
        var ship = _ships[shipId];
        console.log(ship.api_slot);
        for (let [itemId,slotId] of ship.api_slot) {
            if (itemId == -1 || typeof _slotitems[itemId] === "undefined" || _slotitems[itemId] === null) continue;
            var item = _slotitems[itemId];
            var tempTyku = 0.0;
            //Basic tyku

            var tempAlv = typeof item.api_alv !== "undefined" && item.api_alv !== null?item.api_alv:0;
            if (item.api_type[3] in [6,7,8]) {
                tempTyku += Math.sqrt(ship.api_onslot[slotId]) * item.api_tyku;
                tempTyku += aircraftLevelBonus[item.api_type[3]][tempAlv];
                minTyku += Math.floor(tempTyku + Math.sqrt(aircraftExpTable[tempAlv]/10));
                maxTyku += Math.floor(tempTyku + Math.sqrt(aircraftExpTable[tempAlv+1]/10));
            } else if (item.api_type[3] == 10 && (item.api_type[2] == 11 || item.api_type[2] == 45)) {
                tempTyku += Math.sqrt(ship.api_onslot[slotId]) * item.api_tyku;
                tempTyku += aircraftLevelBonus[item.api_type[2]][tempAlv];
                minTyku += Math.floor(tempTyku + Math.sqrt(aircraftExpTable[tempAlv] / 10));
                maxTyku += Math.floor(tempTyku + Math.sqrt(aircraftExpTable[tempAlv + 1] / 10));
            }
        }
    }
    min: minTyku;
    max: maxTyku;
};

class HashTable {
    constructor(raw) {
        if (typeof(raw) == "object") this.data = raw;
    }
    miss(key) {
        return this.data[this.hash(key)] === "undefined" || this.data[this.hash(key)] === null;
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

const sum = (arr) => {
    return arr.reduce((total,item)=>{return total+item});
};

const hashCode = (val) => {
    return val.split('').reduce((h,ch) => {
        if (typeof(h)=="string") h = h.charCodeAt(0);
        h = ((h<<5)-h)+ch.charCodeAt(0);
        h |= 0;
    })
};

export {
    getTyku,
    sum,
    hashCode,
    HashTable
};