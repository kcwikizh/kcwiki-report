# Tyku
# 制空値 = [(艦載機の対空値) × √(搭載数)] の総計 + 熟練補正
getTyku = (deck) ->
  {$ships, $slotitems, _ships, _slotitems} = window
  basicTyku = alvTyku = totalTyku = 0
  for shipId in deck.api_ship
    continue if shipId == -1
    ship = _ships[shipId]
    for itemId, slotId in ship.api_slot
      continue unless itemId != -1 && _slotitems[itemId]?
      item = _slotitems[itemId]
      # Basic tyku
      if item.api_type[3] in [6, 7, 8]
        basicTyku += Math.floor(Math.sqrt(ship.api_onslot[slotId]) * item.api_tyku)
      else if item.api_type[3] == 10 && item.api_type[2] == 11
        basicTyku += Math.floor(Math.sqrt(ship.api_onslot[slotId]) * item.api_tyku)
      # Alv
      if item.api_type[3] == 6 && item.api_alv > 0 && item.api_alv <= 7
        alvTyku += [0, 1, 4, 6, 11, 16, 17, 25][item.api_alv]
      else if item.api_type[3] in [7, 8] && item.api_alv == 7
        alvTyku += 3
      else if item.api_type[3] == 10 && item.api_type[2] == 11 && item.api_alv == 7
        alvTyku += 9
  totalTyku = basicTyku + alvTyku

  basic: basicTyku
  alv: alvTyku
  total: totalTyku


class HashTable
  constructor: (@data) ->

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