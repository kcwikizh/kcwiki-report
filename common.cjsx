# Tyku
# 制空値= ∑ [艦載機の対空値 x √(搭載数) + √(熟練値/10) + 机种制空加值 ] ( [ ] 方括号代表取整)
aircraftExpTable = [0, 10, 25, 40, 55, 70, 85, 100, 121]
aircraftLevelBonus = {
  '6': [0, 0, 2, 5, 9, 14, 14, 22, 22],
  '7': [0, 0, 0, 0, 0, 0, 0, 0, 0],
  '8': [0, 0, 0, 0, 0, 0, 0, 0, 0],
  '11': [0, 1, 1, 1, 1, 3, 3, 6, 6],
  '45': [0, 0, 0, 0, 0, 0, 0, 0, 0]
}
getTyku = (deck) ->
  {$ships, $slotitems, _ships, _slotitems} = window
  minTyku = maxTyku = 0
  for shipId in deck.api_ship
    continue if shipId == -1
    ship = _ships[shipId]
    for itemId, slotId in ship.api_slot
      continue unless itemId != -1 && _slotitems[itemId]?
      item = _slotitems[itemId]
      tempTyku = 0.0
      # Basic tyku

      tempAlv = if item.api_alv? then item.api_alv else 0
      if item.api_type[3] in [6, 7, 8]
        tempTyku += Math.sqrt(ship.api_onslot[slotId]) * item.api_tyku
        tempTyku += aircraftLevelBonus[item.api_type[3]][tempAlv]
        minTyku += Math.floor(tempTyku + Math.sqrt(aircraftExpTable[tempAlv] / 10))
        maxTyku += Math.floor(tempTyku + Math.sqrt(aircraftExpTable[tempAlv + 1] / 10))

      else if item.api_type[3] == 10 && (item.api_type[2] == 11 || item.api_type[2] == 45)
        tempTyku += Math.sqrt(ship.api_onslot[slotId]) * item.api_tyku
        tempTyku += aircraftLevelBonus[item.api_type[2]][tempAlv]
        minTyku += Math.floor(tempTyku + Math.sqrt(aircraftExpTable[tempAlv] / 10))
        maxTyku += Math.floor(tempTyku + Math.sqrt(aircraftExpTable[tempAlv + 1] / 10))
  
  min: minTyku
  max: maxTyku

class HashTable
  constructor: (raw) ->
    @data = raw if typeof raw is "object"
  miss: (key) ->
    not @data[@hash(key)]?
  put: (obj) ->
    @data[@hash(obj)] = true
  hash: (obj) ->
    hashCode JSON.stringify obj
  clear: () ->
    @data = {}
  raw: () ->
    @data

sum = (arr) ->
  arr.reduce (total, item) -> total + item

# JS Implementation of Java's String Hashcode Method
# http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
hashCode = (val) ->
  val.split('').reduce (h, ch) -> 
    h = h.charCodeAt(0) if typeof(h) is 'string';
    h = ((h << 5) - h) + ch.charCodeAt(0);
    h |= 0;

module.exports =
  getTyku: getTyku
  sum: sum
  hashCode: hashCode
  HashTable: HashTable