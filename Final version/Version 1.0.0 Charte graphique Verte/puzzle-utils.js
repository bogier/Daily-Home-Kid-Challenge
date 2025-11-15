// --- Seeded RNG helpers (stable randomization per enfant/semaine) ---
function xmur3(str) {
  for (var i = 0, h = 1779033703 ^ str.length; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = h << 13 | h >>> 19;
  }
  return function() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }
}

function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function seededShuffle(n, seedStr) {
  const order = Array.from({length:n}, (_,i)=>i);
  const seedGen = xmur3(seedStr);
  const rand = mulberry32(seedGen());
  for(let i=n-1;i>0;i--){
    const j = Math.floor(rand()*(i+1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
