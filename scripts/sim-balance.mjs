// Monte Carlo balance simulation for Politicmon.
// Replicates formulas from src/game/battle/sim.ts, src/game/monster.ts,
// src/data/poltypes.ts in pure JS using the REAL numbers from the data files.

// ---------------------- DATA (copied from src/data) ----------------------

const SPECIES = {
  giorgetta: { types: ["DESTRA"], base: { hp: 50, atk: 58, def: 55, spc: 56, spd: 50 }, learnset: [[1,"radici"],[1,"comizio"],[1,"slogan"],[5,"iosonogiorgia"],[11,"giravolta"],[13,"blocconavale"]] },
  giorgiagon: { types: ["DESTRA"], base: { hp: 76, atk: 84, def: 76, spc: 95, spd: 75 }, learnset: [[1,"comizio"],[1,"radici"],[16,"fiammatricolore"],[22,"blocconavale"],[28,"decreto"]] },
  ellyna: { types: ["SINISTRA"], base: { hp: 49, atk: 54, def: 57, spc: 58, spd: 52 }, learnset: [[1,"corteo"],[1,"comizio"],[1,"ztl"],[5,"greenwashing"],[11,"sciopero"],[13,"scissione"]] },
  schleinix: { types: ["SINISTRA","VERDE"], base: { hp: 74, atk: 74, def: 78, spc: 98, spd: 74 }, learnset: [[1,"corteo"],[1,"ztl"],[16,"greenwashing"],[20,"sciopero"],[26,"scissione"]] },
  renzino: { types: ["CENTRO"], base: { hp: 49, atk: 57, def: 52, spc: 50, spd: 62 }, learnset: [[1,"giravolta"],[1,"comizio"],[1,"promessa"],[5,"terzopolo"],[11,"inciucio"],[13,"staisereno"]] },
  renzilla: { types: ["CENTRO"], base: { hp: 71, atk: 88, def: 72, spc: 80, spd: 90 }, learnset: [[1,"giravolta"],[1,"terzopolo"],[16,"staisereno"],[22,"inciucio"],[28,"editoriale"]] },
  salvinott: { types: ["POPULISMO"], base: { hp: 50, atk: 56, def: 42, spc: 40, spd: 46 }, learnset: [[1,"comizio"],[3,"slogan"],[7,"citofonata"],[12,"ruspa"]] },
  salvinator: { types: ["POPULISMO","DESTRA"], base: { hp: 75, atk: 88, def: 62, spc: 58, spd: 68 }, learnset: [[1,"ruspa"],[1,"citofonata"],[18,"mojito"],[23,"blocconavale"],[28,"vaffa"]] },
  grillix: { types: ["POPULISMO","VERDE"], base: { hp: 55, atk: 62, def: 50, spc: 72, spd: 82 }, learnset: [[1,"comizio"],[5,"monopattino"],[9,"slogan"],[14,"greenwashing"],[19,"vaffa"]] },
  contemorfo: { types: ["CENTRO","POPULISMO"], base: { hp: 62, atk: 50, def: 72, spc: 76, spd: 45 }, learnset: [[1,"comizio"],[6,"pochette"],[10,"inciucio"],[15,"telepromessa"],[21,"conferenza"]] },
  calendauro: { types: ["TECNO","CENTRO"], base: { hp: 58, atk: 55, def: 76, spc: 78, spd: 42 }, learnset: [[1,"grafico"],[6,"giravolta"],[11,"dossier"],[16,"spread"],[22,"terzopolo"]] },
  vannaccix: { types: ["DESTRA"], base: { hp: 66, atk: 86, def: 60, spc: 40, spd: 56 }, learnset: [[1,"comizio"],[7,"radici"],[12,"mondocontrario"],[18,"blocconavale"]] },
  tajanide: { types: ["CENTRO","MEDIA"], base: { hp: 56, atk: 45, def: 66, spc: 66, spd: 58 }, learnset: [[1,"comizio"],[5,"promessa"],[10,"conferenza"],[16,"moralsuasion"],[22,"inciucio"]] },
  berlusconix: { types: ["MEDIA"], base: { hp: 80, atk: 70, def: 65, spc: 105, spd: 85 }, learnset: [[1,"tweet"],[1,"telepromessa"],[12,"conferenza"],[18,"editoriale"],[25,"bunga"]] },
  draghimon: { types: ["TECNO","ISTITUZIONE"], base: { hp: 85, atk: 75, def: 90, spc: 115, spd: 80 }, learnset: [[1,"spread"],[1,"moralsuasion"],[15,"dossier"],[20,"fiducia"],[26,"whatever"]] },
  mattarellux: { types: ["ISTITUZIONE"], base: { hp: 90, atk: 70, def: 95, spc: 100, spd: 70 }, learnset: [[1,"moralsuasion"],[1,"fiducia"],[18,"aureola"],[24,"decreto"],[30,"scioglimento"]] },
  trumpon: { types: ["POPULISMO","MEDIA"], base: { hp: 85, atk: 95, def: 70, spc: 90, spd: 75 }, learnset: [[1,"comizio"],[1,"covfefe"],[16,"tweet"],[22,"dazilampo"],[28,"editoriale"]] },
  putingrad: { types: ["DESTRA","ISTITUZIONE"], base: { hp: 90, atk: 90, def: 88, spc: 70, spd: 58 }, learnset: [[1,"comizio"],[1,"tavololungo"],[16,"gasdotto"],[24,"dossier"],[30,"blocconavale"]] },
  xipanda: { types: ["ISTITUZIONE","TECNO"], base: { hp: 88, atk: 75, def: 95, spc: 82, spd: 55 }, learnset: [[1,"comizio"],[1,"oscuramento"],[16,"viadellaseta"],[24,"spread"],[30,"fiducia"]] },
  macronfox: { types: ["CENTRO","TECNO"], base: { hp: 70, atk: 62, def: 70, spc: 88, spd: 86 }, learnset: [[1,"giravolta"],[1,"enmarche"],[14,"inciucio"],[20,"jupiter"],[26,"multaue"]] },
  ursulax: { types: ["TECNO","ISTITUZIONE"], base: { hp: 75, atk: 60, def: 82, spc: 96, spd: 70 }, learnset: [[1,"grafico"],[1,"direttiva"],[16,"multaue"],[22,"moralsuasion"],[28,"scioglimento"]] },
  bojoon: { types: ["POPULISMO","MEDIA"], base: { hp: 75, atk: 82, def: 60, spc: 72, spd: 66 }, learnset: [[1,"comizio"],[1,"slogan"],[12,"citofonata"],[18,"conferenza"],[24,"brexit"]] },
  zelenskir: { types: ["ISTITUZIONE","MEDIA"], base: { hp: 72, atk: 76, def: 68, spc: 80, spd: 80 }, learnset: [[1,"comizio"],[1,"resilienza"],[14,"appelloalleati"],[20,"corteo"],[26,"editoriale"]] },
  muskrat: { types: ["TECNO","MEDIA"], base: { hp: 65, atk: 70, def: 56, spc: 100, spd: 96 }, learnset: [[1,"tweet"],[1,"memedoge"],[14,"grafico"],[20,"razzox"],[26,"spread"]] },
  capitanone: { types: ["POPULISMO","DESTRA"], base: { hp: 88, atk: 102, def: 74, spc: 62, spd: 72 }, learnset: [[1,"ruspa"],[1,"mojito"],[1,"pienipoteri"],[30,"blocconavale"],[34,"dazilampo"]] },
};

const MOVES = {
  comizio: { type:"POPULISMO", category:"fisico", power:40, accuracy:100, pp:35 },
  slogan: { type:"POPULISMO", category:"status", power:0, accuracy:100, pp:30, effect:{ stat:{key:"def",stages:-1,target:"foe"} } },
  promessa: { type:"POPULISMO", category:"status", power:0, accuracy:100, pp:25, effect:{ stat:{key:"atk",stages:-1,target:"foe"} } },
  ruspa: { type:"POPULISMO", category:"fisico", power:75, accuracy:90, pp:15 },
  mojito: { type:"POPULISMO", category:"status", power:0, accuracy:100, pp:10, effect:{ healRatio:0.5 } },
  citofonata: { type:"POPULISMO", category:"fisico", power:50, accuracy:95, pp:20, effect:{ status:{id:"gaffe",chance:30,target:"foe"} } },
  vaffa: { type:"POPULISMO", category:"speciale", power:90, accuracy:85, pp:10 },
  tweet: { type:"MEDIA", category:"speciale", power:45, accuracy:100, pp:30, effect:{ status:{id:"scandalo",chance:20,target:"foe"} } },
  conferenza: { type:"MEDIA", category:"speciale", power:60, accuracy:100, pp:20 },
  telepromessa: { type:"MEDIA", category:"status", power:0, accuracy:90, pp:15, effect:{ status:{id:"gaffe",chance:100,target:"foe"} } },
  editoriale: { type:"MEDIA", category:"speciale", power:80, accuracy:95, pp:10 },
  bunga: { type:"MEDIA", category:"speciale", power:95, accuracy:90, pp:5, effect:{ status:{id:"gaffe",chance:30,target:"foe"} } },
  decreto: { type:"ISTITUZIONE", category:"fisico", power:65, accuracy:100, pp:20 },
  fiducia: { type:"ISTITUZIONE", category:"status", power:0, accuracy:100, pp:20, effect:{ stat:{key:"def",stages:2,target:"self"} } },
  moralsuasion: { type:"ISTITUZIONE", category:"speciale", power:55, accuracy:100, pp:20 },
  scioglimento: { type:"ISTITUZIONE", category:"speciale", power:100, accuracy:70, pp:5 },
  aureola: { type:"ISTITUZIONE", category:"status", power:0, accuracy:100, pp:5, effect:{ healRatio:0.5, cureStatus:true } },
  dossier: { type:"TECNO", category:"speciale", power:55, accuracy:95, pp:15, effect:{ status:{id:"indagato",chance:30,target:"foe"} } },
  spread: { type:"TECNO", category:"speciale", power:70, accuracy:100, pp:15 },
  whatever: { type:"TECNO", category:"speciale", power:110, accuracy:85, pp:5 },
  grafico: { type:"TECNO", category:"speciale", power:40, accuracy:100, pp:25, effect:{ stat:{key:"spc",stages:-1,target:"foe",chance:100} } },
  giravolta: { type:"CENTRO", category:"fisico", power:55, accuracy:100, pp:25 },
  inciucio: { type:"CENTRO", category:"speciale", power:40, accuracy:100, pp:15, effect:{ drainRatio:0.5 } },
  staisereno: { type:"CENTRO", category:"fisico", power:70, accuracy:100, pp:10, effect:{ highCrit:true } },
  terzopolo: { type:"CENTRO", category:"status", power:0, accuracy:100, pp:20, effect:{ stat:{key:"spd",stages:1,target:"self"} } },
  pochette: { type:"CENTRO", category:"status", power:0, accuracy:100, pp:15, effect:{ stat:{key:"spc",stages:1,target:"self"} } },
  blocconavale: { type:"DESTRA", category:"fisico", power:75, accuracy:80, pp:10 },
  radici: { type:"DESTRA", category:"fisico", power:55, accuracy:100, pp:25 },
  iosonogiorgia: { type:"DESTRA", category:"status", power:0, accuracy:100, pp:10, effect:{ stat:{key:"atk",stages:1,target:"self"} } },
  fiammatricolore: { type:"DESTRA", category:"speciale", power:85, accuracy:95, pp:10 },
  mondocontrario: { type:"DESTRA", category:"fisico", power:80, accuracy:75, pp:10 },
  corteo: { type:"SINISTRA", category:"fisico", power:60, accuracy:100, pp:20 },
  sciopero: { type:"SINISTRA", category:"fisico", power:70, accuracy:95, pp:15 },
  scissione: { type:"SINISTRA", category:"speciale", power:90, accuracy:95, pp:10, effect:{ recoilRatio:0.25 } },
  ztl: { type:"SINISTRA", category:"status", power:0, accuracy:100, pp:25, effect:{ stat:{key:"spd",stages:-1,target:"foe"} } },
  greenwashing: { type:"VERDE", category:"speciale", power:50, accuracy:100, pp:20, effect:{ status:{id:"gaffe",chance:20,target:"foe"} } },
  monopattino: { type:"VERDE", category:"fisico", power:40, accuracy:100, pp:30, effect:{ priority:1 } },
  dazilampo: { type:"POPULISMO", category:"fisico", power:85, accuracy:90, pp:10 },
  covfefe: { type:"MEDIA", category:"status", power:0, accuracy:90, pp:10, effect:{ status:{id:"gaffe",chance:100,target:"foe"} } },
  gasdotto: { type:"TECNO", category:"speciale", power:75, accuracy:95, pp:10 },
  tavololungo: { type:"ISTITUZIONE", category:"status", power:0, accuracy:100, pp:10, effect:{ stat:{key:"def",stages:2,target:"self"} } },
  viadellaseta: { type:"TECNO", category:"speciale", power:60, accuracy:100, pp:10, effect:{ drainRatio:0.5 } },
  oscuramento: { type:"ISTITUZIONE", category:"status", power:0, accuracy:90, pp:10, effect:{ stat:{key:"spc",stages:-2,target:"foe"} } },
  enmarche: { type:"CENTRO", category:"status", power:0, accuracy:100, pp:15, effect:{ stat:{key:"spd",stages:2,target:"self"} } },
  jupiter: { type:"CENTRO", category:"speciale", power:75, accuracy:95, pp:10 },
  multaue: { type:"TECNO", category:"speciale", power:70, accuracy:95, pp:10, effect:{ stat:{key:"spc",stages:-1,target:"foe",chance:50} } },
  direttiva: { type:"ISTITUZIONE", category:"status", power:0, accuracy:100, pp:20, effect:{ stat:{key:"atk",stages:-1,target:"foe"} } },
  brexit: { type:"POPULISMO", category:"speciale", power:100, accuracy:90, pp:5, effect:{ recoilRatio:0.33 } },
  resilienza: { type:"ISTITUZIONE", category:"status", power:0, accuracy:100, pp:10, effect:{ healRatio:0.5, stat:{key:"def",stages:1,target:"self"} } },
  appelloalleati: { type:"MEDIA", category:"speciale", power:70, accuracy:100, pp:15 },
  razzox: { type:"TECNO", category:"speciale", power:95, accuracy:85, pp:5 },
  pienipoteri: { type:"DESTRA", category:"status", power:0, accuracy:100, pp:10, effect:{ stat:{key:"atk",stages:2,target:"self"} } },
  memedoge: { type:"MEDIA", category:"status", power:0, accuracy:90, pp:10, effect:{ status:{id:"gaffe",chance:100,target:"foe"} } },
  algoritmo: { type:"TECNO", category:"status", power:0, accuracy:100, pp:15, effect:{ stat:{key:"spc",stages:2,target:"self"} } },
  razzox2: { type:"TECNO", category:"speciale", power:95, accuracy:85, pp:5 },
};

const CHART = {
  POPULISMO: { TECNO: 2, ISTITUZIONE: 2, CENTRO: 0.5 },
  TECNO: { CENTRO: 2, MEDIA: 2, POPULISMO: 0.5 },
  DESTRA: { SINISTRA: 2, VERDE: 2, ISTITUZIONE: 0.5, CENTRO: 0.5 },
  SINISTRA: { DESTRA: 2, SINISTRA: 2, POPULISMO: 0.5 },
  CENTRO: { DESTRA: 2, SINISTRA: 0.5, TECNO: 0.5 },
  MEDIA: { ISTITUZIONE: 2, CENTRO: 2, TECNO: 0.5 },
  ISTITUZIONE: { POPULISMO: 2, MEDIA: 0.5, ISTITUZIONE: 0.5 },
  VERDE: { DESTRA: 2, MEDIA: 2, POPULISMO: 0.5 },
};

function typeMultiplier(attack, defenderTypes) {
  let mult = 1;
  for (const def of defenderTypes) mult *= CHART[attack]?.[def] ?? 1;
  if (mult >= 4) return 2.2;
  if (mult >= 2) return 1.7;
  if (mult > 0 && mult <= 0.25) return 0.45;
  if (mult > 0 && mult < 1) return 0.6;
  return mult;
}

// ---------------------- STAT / LEVEL FORMULAS (monster.ts) ----------------------

function statsOf(speciesId, level) {
  const base = SPECIES[speciesId].base;
  const lv = level;
  return {
    hp: Math.floor((base.hp * 3 * lv) / 100) + lv * 2 + 16,
    atk: Math.floor((base.atk * 2 * lv) / 100) + lv + 5,
    def: Math.floor((base.def * 2 * lv) / 100) + lv + 5,
    spc: Math.floor((base.spc * 2 * lv) / 100) + lv + 5,
    spd: Math.floor((base.spd * 2 * lv) / 100) + 5,
  };
}

function movesAtLevel(speciesId, level) {
  const learnable = SPECIES[speciesId].learnset.filter(([lv]) => lv <= level).map(([, id]) => id);
  const unique = [...new Set(learnable)];
  return unique.slice(-4).map((id) => ({ id, pp: MOVES[id].pp }));
}

// ---------------------- COMBATANT ----------------------

function makeMon(speciesId, level) {
  const s = statsOf(speciesId, level);
  return { speciesId, level, hp: s.hp, status: null, moves: movesAtLevel(speciesId, level) };
}
function makeCombatant(mon) {
  return { mon, stages: { atk: 0, def: 0, spc: 0, spd: 0 }, gaffeTurns: 0 };
}

function stageMult(stage) { return stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage); }
function effectiveStat(c, key) {
  let value = statsOf(c.mon.speciesId, c.mon.level)[key] * stageMult(c.stages[key]);
  if (key === "spd" && c.mon.status === "indagato") value *= 0.5;
  return Math.max(1, Math.floor(value));
}

function calcDamage(attacker, defender, move) {
  if (move.power <= 0) return { damage: 0, crit: false, typeMult: 1 };
  const atkKey = move.category === "fisico" ? "atk" : "spc";
  const defKey = move.category === "fisico" ? "def" : "spc";
  const critChance = move.effect?.highCrit ? 0.25 : 1 / 16;
  const crit = Math.random() < critChance;
  const atk = crit ? statsOf(attacker.mon.speciesId, attacker.mon.level)[atkKey] : effectiveStat(attacker, atkKey);
  const def = crit ? statsOf(defender.mon.speciesId, defender.mon.level)[defKey] : effectiveStat(defender, defKey);
  const level = attacker.mon.level * (crit ? 2 : 1);
  const stab = SPECIES[attacker.mon.speciesId].types.includes(move.type) ? 1.5 : 1;
  const tMult = typeMultiplier(move.type, SPECIES[defender.mon.speciesId].types);
  const base = (((2 * level) / 5 + 2) * move.power * atk) / def / 70 + 2;
  const random = 0.88 + Math.random() * 0.12;
  const damage = Math.max(1, Math.floor(base * stab * tMult * random));
  return { damage: tMult === 0 ? 0 : damage, crit, typeMult: tMult };
}

// ---------------------- AI (chooseFoeMove) ----------------------

// Profili IA come nel codice reale (post-fix). Default = competente.
const AI_COMPETENT = { whiff: 0.25, canHeal: true, finisher: true };
const AI_NORMAL = { whiff: 0.48, canHeal: false, finisher: false }; // wild/comune a 0 medaglie

function chooseFoeMove(foe, target, ai = AI_COMPETENT) {
  const usable = foe.mon.moves.filter((s) => s.pp > 0).map((s) => MOVES[s.id]);
  if (usable.length === 0) return MOVES.comizio;
  if (Math.random() < ai.whiff) return usable[Math.floor(Math.random() * usable.length)];
  const maxHp = statsOf(foe.mon.speciesId, foe.mon.level).hp;
  const hpRatio = foe.mon.hp / maxHp;
  const foeHurt = hpRatio < 0.45;
  const foeHealthy = hpRatio > 0.6;
  const targetMaxHp = statsOf(target.mon.speciesId, target.mon.level).hp;
  const targetLow = target.mon.hp / targetMaxHp < 0.35;
  let best = usable[0], bestScore = -1;
  for (const move of usable) {
    let score;
    if (move.power > 0) {
      const tMult = typeMultiplier(move.type, SPECIES[target.mon.speciesId].types);
      const stab = SPECIES[foe.mon.speciesId].types.includes(move.type) ? 1.5 : 1;
      score = move.power * tMult * stab * (move.accuracy / 100);
      if (targetLow && ai.finisher) score *= 1.4;
    } else if (move.effect?.healRatio) {
      score = ai.canHeal && foeHurt ? 120 + (0.45 - hpRatio) * 200 : 0;
    } else if (move.effect?.stat) {
      const buff = move.effect.stat.target === "self";
      if (buff) {
        const current = foe.stages[move.effect.stat.key];
        score = foeHealthy && current < 3 ? 70 + move.effect.stat.stages * 8 : 12;
      } else {
        const current = target.stages[move.effect.stat.key];
        score = current > -3 ? 55 : 10;
      }
    } else if (move.effect?.status) {
      score = target.mon.status || targetLow ? 8 : 50 + move.effect.status.chance * 0.3;
    } else score = 30;
    if (score > bestScore) { bestScore = score; best = move; }
  }
  return best;
}

// "Reasonable player": pick the move that maximizes EXPECTED damage this turn
// (power * stab * typeMult * acc); ignore pure status moves unless no damage move.
function choosePlayerMove(self, target) {
  const usable = self.mon.moves.filter((s) => s.pp > 0).map((s) => MOVES[s.id]);
  if (usable.length === 0) return MOVES.comizio;
  let best = null, bestScore = -1;
  for (const move of usable) {
    if (move.power <= 0) continue;
    const tMult = typeMultiplier(move.type, SPECIES[target.mon.speciesId].types);
    const stab = SPECIES[self.mon.speciesId].types.includes(move.type) ? 1.5 : 1;
    const score = move.power * stab * tMult * (move.accuracy / 100);
    if (score > bestScore) { bestScore = score; best = move; }
  }
  if (!best) best = usable[0]; // only status moves available
  return best;
}

// ---------------------- TURN ENGINE ----------------------

// Applies one move from attacker against defender; mutates state.
function applyMove(attacker, defender, move) {
  // INDAGATO 25% skip
  if (attacker.mon.status === "indagato" && Math.random() < 0.25) return;
  // GAFFE confusion: 33% hit self (we just waste the turn)
  if (attacker.gaffeTurns > 0) {
    attacker.gaffeTurns -= 1;
    if (Math.random() < 0.33) return;
  }
  // accuracy check (self-targeted status never miss)
  const selfTargeted = move.power === 0 && !move.effect?.status && move.effect?.stat?.target !== "foe";
  if (!selfTargeted && Math.random() * 100 >= move.accuracy) return;

  if (move.power > 0) {
    const res = calcDamage(attacker, defender, move);
    defender.mon.hp = Math.max(0, defender.mon.hp - res.damage);
    if (move.effect?.drainRatio) {
      const max = statsOf(attacker.mon.speciesId, attacker.mon.level).hp;
      attacker.mon.hp = Math.min(max, attacker.mon.hp + Math.max(1, Math.floor(res.damage * move.effect.drainRatio)));
    }
    if (move.effect?.recoilRatio) {
      attacker.mon.hp = Math.max(0, attacker.mon.hp - Math.max(1, Math.floor(res.damage * move.effect.recoilRatio)));
    }
  }
  const fx = move.effect;
  if (fx?.healRatio) {
    const max = statsOf(attacker.mon.speciesId, attacker.mon.level).hp;
    attacker.mon.hp = Math.min(max, attacker.mon.hp + Math.floor(max * fx.healRatio));
    if (fx.cureStatus) attacker.mon.status = null;
  }
  if (fx?.stat) {
    const tgt = fx.stat.target === "self" ? attacker : defender;
    if (fx.stat.chance === undefined || Math.random() * 100 < fx.stat.chance) {
      tgt.stages[fx.stat.key] = Math.max(-6, Math.min(6, tgt.stages[fx.stat.key] + fx.stat.stages));
    }
  }
  if (fx?.status && defender.mon.hp > 0) {
    if (Math.random() * 100 < fx.status.chance) {
      const id = fx.status.id;
      if (!(defender.mon.status || (id === "gaffe" && defender.gaffeTurns > 0))) {
        if (id === "gaffe") defender.gaffeTurns = 2 + Math.floor(Math.random() * 3);
        else defender.mon.status = id;
      }
    }
  }
}

function endOfTurnScandalo(c) {
  if (c.mon.hp > 0 && c.mon.status === "scandalo") {
    c.mon.hp = Math.max(0, c.mon.hp - Math.max(1, Math.floor(statsOf(c.mon.speciesId, c.mon.level).hp / 8)));
  }
}

// Runs a full 1v1 to KO. Returns { winner: "player"|"foe", turns }.
function runBattle(playerSpec, playerLv, foeSpec, foeLv, opts = {}) {
  const player = makeCombatant(makeMon(playerSpec, playerLv));
  const foe = makeCombatant(makeMon(foeSpec, foeLv));
  const maxTurns = 60;
  for (let turn = 1; turn <= maxTurns; turn++) {
    const pMove = choosePlayerMove(player, foe);
    const fMove = chooseFoeMove(foe, player, AI_NORMAL); // scenario tipico: avversario comune
    const pPri = pMove.effect?.priority ?? 0;
    const fPri = fMove.effect?.priority ?? 0;
    let playerFirst;
    if (pPri !== fPri) playerFirst = pPri > fPri;
    else {
      const ps = effectiveStat(player, "spd"), fs = effectiveStat(foe, "spd");
      playerFirst = ps === fs ? Math.random() < 0.5 : ps > fs;
    }
    const order = playerFirst ? [["player", player, foe, pMove], ["foe", foe, player, fMove]]
                              : [["foe", foe, player, fMove], ["player", player, foe, pMove]];
    for (const [, atk, def, mv] of order) {
      if (atk.mon.hp <= 0 || def.mon.hp <= 0) continue;
      applyMove(atk, def, mv);
      if (def.mon.hp <= 0) return { winner: atk === player ? "player" : "foe", turns: turn };
    }
    endOfTurnScandalo(player);
    endOfTurnScandalo(foe);
    if (player.mon.hp <= 0) return { winner: "foe", turns: turn };
    if (foe.mon.hp <= 0) return { winner: "player", turns: turn };
  }
  // timeout -> whoever has more hp%
  const ph = player.mon.hp / statsOf(playerSpec, playerLv).hp;
  const fh = foe.mon.hp / statsOf(foeSpec, foeLv).hp;
  return { winner: ph >= fh ? "player" : "foe", turns: maxTurns };
}

// ---------------------- ANALYSES ----------------------

const N = 4000;
function rng() { return Math.random(); }

// Representative mid-game roster for "even fight" turns-to-KO (evolved starters
// + key species). Mirror match same level => measures pure pacing.
const EVEN_PAIRS = [
  ["giorgiagon","giorgiagon"], ["schleinix","schleinix"], ["renzilla","renzilla"],
  ["salvinator","salvinator"], ["draghimon","draghimon"], ["tajanide","tajanide"],
  ["giorgiagon","schleinix"], ["renzilla","tajanide"], ["draghimon","trumpon"],
];

function avgTurnsEven(level) {
  let total = 0, count = 0;
  for (const [a, b] of EVEN_PAIRS) {
    for (let i = 0; i < N; i++) { total += runBattle(a, level, b, level).turns; count++; }
  }
  return total / count;
}

// Player win-rate at a given level delta, averaged over many random matchups.
function playerWinRate(levelDelta, pool, level) {
  let wins = 0, total = 0, turnsSum = 0;
  for (let i = 0; i < N; i++) {
    const ps = pool[Math.floor(rng() * pool.length)];
    const fs = pool[Math.floor(rng() * pool.length)];
    const r = runBattle(ps, level, fs, level + levelDelta);
    if (r.winner === "player") wins++;
    turnsSum += r.turns;
    total++;
  }
  return { wr: (wins / total) * 100, avgTurns: turnsSum / total };
}

// ---------------------- EARLY GAME (lv 5-12) ----------------------

// Wild pool that appears early (route mons), starters as player.
const STARTERS = ["giorgetta", "ellyna", "renzino"];
const EARLY_WILD = ["salvinott", "grillix", "contemorfo", "tajanide", "vannaccix", "calendauro"];

// Measure: per-hit damage as % of player HP from a typical wild, and
// player turns-to-die / wild turns-to-die at matched levels.
function earlyDanger(level) {
  const results = [];
  for (const player of STARTERS) {
    for (const wild of EARLY_WILD) {
      // average foe hit damage vs player (foe optimal move, no crit avg via MC)
      const pC = makeCombatant(makeMon(player, level));
      const wC = makeCombatant(makeMon(wild, level));
      const playerMaxHp = statsOf(player, level).hp;
      const wildMaxHp = statsOf(wild, level).hp;
      let foeDmgSum = 0, playerDmgSum = 0, samples = 2000;
      for (let i = 0; i < samples; i++) {
        const fMove = chooseFoeMove(wC, pC);
        if (fMove.power > 0) foeDmgSum += calcDamage(wC, pC, fMove).damage;
        const pMove = choosePlayerMove(pC, wC);
        if (pMove.power > 0) playerDmgSum += calcDamage(pC, wC, pMove).damage;
      }
      const foeAvg = foeDmgSum / samples;
      const playerAvg = playerDmgSum / samples;
      results.push({
        player, wild, level,
        playerMaxHp, wildMaxHp,
        foeHitPct: (foeAvg / playerMaxHp) * 100,
        playerHitPct: (playerAvg / wildMaxHp) * 100,
        playerTurnsToDie: playerMaxHp / Math.max(1, foeAvg),
        wildTurnsToDie: wildMaxHp / Math.max(1, playerAvg),
      });
    }
  }
  return results;
}

// First trainer fights: player team vs trainer team (sequential 1v1, player
// keeps its mon, trainer cycles). We approximate with single ace vs ace.
const FIRST_TRAINERS = [
  { name: "PORTABORSE PIERO", team: [["salvinott",4],["salvinott",5]], playerLv: 6 },
  { name: "GIORNALISTA RITA", team: [["tajanide",7]], playerLv: 8 },
  { name: "INFLUENCER CHIARA", team: [["vannaccix",9],["bojoon",9]], playerLv: 10 },
  { name: "LOBBISTA EUGENIO", team: [["contemorfo",11],["tajanide",12]], playerLv: 14 },
];

function trainerWinRate(t) {
  let wins = 0;
  const M = 3000;
  for (let i = 0; i < M; i++) {
    const player = STARTERS[Math.floor(rng() * STARTERS.length)];
    // player faces the trainer's ace (highest level mon) at playerLv
    const ace = t.team.reduce((a, b) => (b[1] > a[1] ? b : a));
    const r = runBattle(player, t.playerLv, ace[0], ace[1]);
    if (r.winner === "player") wins++;
  }
  return (wins / M) * 100;
}

// ---------------------- STAT GROWTH CURVE ----------------------

function statGrowth() {
  const rows = [];
  const sample = "giorgiagon"; // mid evolved, base hp70 atk80 def70 spc95 spd75
  for (const lv of [5, 10, 15, 20, 25, 30, 40, 50]) {
    rows.push({ lv, ...statsOf(sample, lv) });
  }
  // per-level deltas averaged
  const a = statsOf(sample, 5), b = statsOf(sample, 50);
  const perLv = {
    hp: (b.hp - a.hp) / 45,
    atk: (b.atk - a.atk) / 45,
    def: (b.def - a.def) / 45,
    spc: (b.spc - a.spc) / 45,
    spd: (b.spd - a.spd) / 45,
  };
  return { rows, perLv, sample };
}

// ---------------------- RUN ----------------------

console.log("=== POLITICMON BALANCE SIMULATION (N=" + N + " per matchup) ===\n");

console.log("--- 1. TURNI MEDI PER KO (scontro alla pari, stesso livello) ---");
for (const lv of [10, 20, 30]) {
  console.log(`  Livello ${lv}: ${avgTurnsEven(lv).toFixed(2)} turni medi`);
}

console.log("\n--- 2. WIN-RATE GIOCATORE (gioca la mossa piu forte) vs IA ---");
const MID_POOL = ["giorgiagon","schleinix","renzilla","salvinator","draghimon","tajanide","trumpon","macronfox","vannaccix","muskrat"];
for (const lv of [20]) {
  for (const d of [-2, 0, 2]) {
    const r = playerWinRate(d, MID_POOL, lv);
    console.log(`  Lv ${lv}, delta ${d >= 0 ? "+" : ""}${d}: win-rate ${r.wr.toFixed(1)}%  (${r.avgTurns.toFixed(1)} turni)`);
  }
}

console.log("\n--- 3. DIFFICOLTA EARLY GAME (lv 5-12) ---");
for (const lv of [5, 8, 12]) {
  const res = earlyDanger(lv);
  const avgFoePct = res.reduce((s, r) => s + r.foeHitPct, 0) / res.length;
  const avgPlayerPct = res.reduce((s, r) => s + r.playerHitPct, 0) / res.length;
  const avgPlayerTTD = res.reduce((s, r) => s + r.playerTurnsToDie, 0) / res.length;
  const worst = res.reduce((a, b) => (b.foeHitPct > a.foeHitPct ? b : a));
  const exHp = statsOf(STARTERS[0], lv).hp;
  console.log(`  Lv ${lv}: HP starter ~${exHp}. Wild medio colpisce ${avgFoePct.toFixed(1)}% HP/colpo, giocatore ${avgPlayerPct.toFixed(1)}% HP/colpo.`);
  console.log(`         Il giocatore muore in ~${avgPlayerTTD.toFixed(1)} colpi presi. Peggior matchup: ${worst.player} vs ${worst.wild} = ${worst.foeHitPct.toFixed(1)}% HP/colpo (muore in ${worst.playerTurnsToDie.toFixed(1)}).`);
}

console.log("\n  Primi allenatori (win-rate giocatore con starter, gioco ragionevole):");
for (const t of FIRST_TRAINERS) {
  console.log(`    ${t.name} (ace lv ${t.team.reduce((a,b)=>b[1]>a[1]?b:a)[1]}, tu lv ${t.playerLv}): ${trainerWinRate(t).toFixed(1)}%`);
}

console.log("\n--- 4. CURVA DI CRESCITA STATS (esempio: GIORGIAGON) ---");
const g = statGrowth();
console.log("  Lv | HP  ATK DEF SPC SPD");
for (const r of g.rows) {
  console.log(`  ${String(r.lv).padStart(2)} | ${String(r.hp).padStart(3)} ${String(r.atk).padStart(3)} ${String(r.def).padStart(3)} ${String(r.spc).padStart(3)} ${String(r.spd).padStart(3)}`);
}
console.log(`  Crescita media per livello (lv5->50): HP +${g.perLv.hp.toFixed(2)}, ATK +${g.perLv.atk.toFixed(2)}, DEF +${g.perLv.def.toFixed(2)}, SPC +${g.perLv.spc.toFixed(2)}, SPD +${g.perLv.spd.toFixed(2)}`);

// Damage growth: how does a fixed-power move's damage scale with level (mirror)?
console.log("\n  Scaling danno mossa power-75 mirror (giorgiagon vs giorgiagon, no crit, random=1):");
for (const lv of [10, 20, 30, 40]) {
  const atk = statsOf("giorgiagon", lv).atk;
  const def = statsOf("giorgiagon", lv).def;
  const hp = statsOf("giorgiagon", lv).hp;
  const base = (((2 * lv) / 5 + 2) * 75 * atk) / def / 70 + 2;
  const dmg = Math.floor(base * 1.0 * 1.0); // no stab/type for clarity
  console.log(`    Lv ${lv}: danno ~${dmg} su HP ${hp} = ${((dmg/hp)*100).toFixed(1)}% HP/colpo (servono ~${(hp/dmg).toFixed(1)} colpi)`);
}
