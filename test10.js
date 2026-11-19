/* Headless content-validation gate — runs the engine's own validator in Node.

   The defect it pins: `js/validate.js` ships a real content validator
   (`G.validateContent()`) and its header says it can be run "via the harness in
   tests" — but there was no harness. `tools/verify.js` drives it through
   Playwright, so it needs a browser; the CI job that actually gates a push only
   ran test6–test9. So the one check that catches a dangling reference — an
   objective naming an enemy that is spawned nowhere, a recipe costing an item
   that does not exist — never ran on a push. A modder who replaces `js/data/`
   found out from a silent no-spawn, not from CI.

   What this suite proves:
     1. the world modules load and the validator is actually present, so a load
        failure cannot masquerade as "no errors" (an empty validator that is
        missing returns nothing, which reads exactly like a clean run);
     2. the shipped sample world validates with zero errors;
     3. the gate is not vacuous — a deliberately broken copy of the world in a
        SECOND sandbox must produce errors. A validator that always says "clean"
        fails that assertion.

     node test10.js
*/
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('PASS  ' + name + (extra ? '  (' + extra + ')' : '')); }
  else { fail++; console.log('FAIL  ' + name + (extra ? '  (' + extra + ')' : '')); }
};

const ROOT = __dirname;

/* ---------- the shim: enough of a browser global to run the data + validator ----------
   `world.js` and `validate.js` are IIFEs that only DEFINE functions at load
   time, so no DOM is needed; anything that does touch the DOM is called from
   `boot()` or a render path, neither of which runs here. */
function loadWorld(mutate) {
  const ctx = { console, window: {}, document: {}, navigator: {} };
  ctx.globalThis = ctx;
  vm.createContext(ctx);

  const run = (rel) => {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    vm.runInContext(src, ctx, { filename: rel });
  };

  // 1. the world: every data file, in the same order a page loads them
  const dataDir = path.join(ROOT, 'js', 'data');
  const dataFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('.js')).sort();
  for (const f of dataFiles) run(path.join('js', 'data', f));
  // 2. LOCAL_MAPS — where each enemy is actually reachable lives in world.js, not
  //    in js/data/, and the validator reads it to decide "spawned nowhere".
  //    core.js comes with it: it carries the stat totals the set bonuses and the
  //    gem sockets feed (`setBonuses`, `gemTotals`, `flatBonus`), so a check on
  //    what those bonuses are WORTH has nothing to call without it. Both files
  //    are IIFEs that only define functions at load time.
  run('js/core.js');
  run('js/world.js');
  // 3. the companions module — it defines the behaviour vocabulary the validator
  //    checks against (G.COMPANION_BEHAVIOURS) and the resolver the dispatch uses,
  //    and it is an IIFE that only defines functions at load time, so no state,
  //    DOM or combat is needed to load it.
  run('js/companions.js');
  // 4. the validator itself
  run('js/validate.js');

  const G = ctx.window.Game;
  if (mutate) mutate(G);
  // `ctx` is the vm sandbox: the intercept test needs to pin Math.random, and the
  // sandbox has its own Math realm, so it can only be stubbed from inside it.
  return { G, dataFiles, ctx };
}

/* ---------- 1. the harness loaded something ---------- */
{
  const { G, dataFiles } = loadWorld();
  ok('every js/data file loads', dataFiles.length > 0, dataFiles.length + ' files');
  ok('the sample world is present', !!G.ENEMIES && Object.keys(G.ENEMIES).length > 0,
     (G.ENEMIES ? Object.keys(G.ENEMIES).length : 0) + ' enemies');
  ok('G.LOCAL_MAPS loaded (the validator reads it to place enemies)',
     !!G.LOCAL_MAPS && Object.keys(G.LOCAL_MAPS).length > 0,
     (G.LOCAL_MAPS ? Object.keys(G.LOCAL_MAPS).length : 0) + ' regions');
  ok('G.validateContent is a function', typeof G.validateContent === 'function');
}

/* ---------- 2. the shipped world is clean ---------- */
{
  const { G } = loadWorld();
  const r = G.validateContent();
  ok('the validator returns {errors, warnings}', Array.isArray(r.errors) && Array.isArray(r.warnings));
  ok('the shipped sample world has no content errors', r.errors.length === 0,
     r.errors.length ? r.errors.map(e => `${e.where}: ${e.msg}`).join(' | ') : 'clean');
  ok('warnings are warnings, not errors', r.warnings.every(w => w && w.where && w.msg),
     r.warnings.length + ' warning(s)');
}

/* ---------- 3. the gate is not vacuous ----------
   Three independent breakages, one sandbox each: a spawn pointing at an enemy
   that does not exist, an objective targeting one, and a recipe costing an item
   that does not exist. Each must produce at least one error. */
const breakages = [
  ['a location spawns an enemy that does not exist', G => {
    G.LOCAL_MAPS.wilds.push({ id:'ghost_den', name:'Ghost Den', emoji:'👻', x:1, y:1, act:'hunt', spawn:['no_such_enemy'] });
  }],
  ['a chapter objective names an enemy that does not exist', G => {
    G.CHAPTERS[0].objective = { type:'kill', target:'no_such_enemy', required:1, label:'Defeat nothing' };
  }],
  ['a recipe costs an item that does not exist', G => {
    G.GEAR.hand_axe.cost = { unobtainium:3 };
  }],
];

for (const [what, mutate] of breakages) {
  const { G } = loadWorld(mutate);
  let r;
  try { r = G.validateContent(); } catch (e) { r = { errors: [], warnings: [], threw: e.message }; }
  ok('the validator catches: ' + what, !r.threw && r.errors.length > 0,
     r.threw ? 'threw: ' + r.threw : r.errors.length + ' error(s)');
}

/* ---------- 4. the render path the validator is protecting ----------
   The Forge builds its cost line with G.recipeCostLine. Before the fix that line
   read G.ITEMS[k].emoji directly, so an unknown ingredient threw a TypeError and
   the whole tab rendered nothing. These assertions pin the seam itself. */
{
  const { G } = loadWorld();
  const recipes = G.recipes();
  ok('G.recipes() lists the craftable world', recipes.length > 0, recipes.length + ' recipes');

  const unresolved = recipes.filter(r => Object.keys(r.cost || {}).some(k => !G.ITEMS[k]));
  ok('every ingredient the Forge renders resolves to an item', unresolved.length === 0,
     unresolved.length ? 'unresolved in: ' + unresolved.map(r => r.key).join(' ') : 'all resolve');

  const lines = recipes.map(r => G.recipeCostLine(r));
  ok('every recipe renders a non-empty cost line', lines.every(l => typeof l === 'string' && l.length > 0),
     lines.length + ' lines');

  // the guard: a broken ingredient must render, not throw
  let broke = null;
  try { broke = G.recipeCostLine({ key:'x', cost:{ unobtainium:3 } }); }
  catch (e) { broke = 'THREW: ' + e.message; }
  ok('an unknown ingredient renders a placeholder instead of throwing',
     typeof broke === 'string' && broke.indexOf('THREW') !== 0 && broke.indexOf('❓') >= 0, broke);
}

/* ---------- 5. gear sets: the promised bonus must be one the engine reads ----------
   The class this pins is the mirror of section 3's: not a reference that points at
   nothing, but an EFFECT NOTHING POINTS AT. Two shipped in this sample world.

   * Shadow's three-piece tier grants `crime`. `setBonuses()` copied it into its
     result object and `crimeChance()` never read it, so wearing the hood, the
     boots and the twin daggers changed the crime odds by exactly zero while the
     set's own description advertised "+15% crime".
   * Duelist declared three pieces across two slots — the katana (weapon) and two
     offhands — and only one offhand can be worn, so its three-piece tier could
     not be reached by any legal loadout.

   `setBonuses()` copies EVERY key a set declares and only eight are ever read:
   atk (atkPower), def (defPower), spell (spellPower), crit (critChance),
   flee (fleeChance), hp (maxHp), energy (maxEnergy), crime (crimeChance). */
const SET_BONUS_KEYS = ['atk','def','spell','crit','flee','hp','energy','crime'];

{
  const { G } = loadWorld();
  const sets = G.GEAR_SETS || {};
  ok('the sample world ships gear sets', Object.keys(sets).length > 0,
     Object.keys(sets).length + ' sets');

  const unknownKeys = [];
  for (const sid in sets) {
    for (const tier of ['b2', 'b3']) {
      const b = sets[sid][tier];
      if (!b) continue;
      for (const k in b) if (SET_BONUS_KEYS.indexOf(k) < 0) unknownKeys.push(`${sid}.${tier}.${k}`);
    }
  }
  ok('every shipped set grants only bonuses the engine reads', unknownKeys.length === 0,
     unknownKeys.length ? 'unread: ' + unknownKeys.join(', ') : SET_BONUS_KEYS.length + ' accepted keys');

  const missingPieces = [];
  const slotSpread = {};
  for (const sid in sets) {
    const slots = new Set();
    (sets[sid].pieces || []).forEach(p => {
      if (!G.GEAR[p]) { missingPieces.push(`${sid}:${p}`); return; }
      slots.add(G.GEAR[p].slot);
    });
    slotSpread[sid] = slots.size;
  }
  ok('every set piece is a real gear item', missingPieces.length === 0,
     missingPieces.length ? 'missing: ' + missingPieces.join(', ') : 'all resolve');

  const unreachable = [];
  for (const sid in sets) {
    for (const [tier, need] of [['b2', 2], ['b3', 3]]) {
      if (!sets[sid][tier]) continue;
      if (slotSpread[sid] < need) unreachable.push(`${sid}.${tier} (${slotSpread[sid]} slot(s), needs ${need})`);
    }
  }
  ok('every set tier is reachable by some legal loadout', unreachable.length === 0,
     unreachable.length ? 'unreachable: ' + unreachable.join(', ') : 'all tiers wear-able');
}

/* ---------- 6. the two defects, behaviourally ----------
   A structural check can be satisfied by a set that declares nothing. These call
   the functions the player's numbers actually come from, so they fail if the fix
   is reverted even while the data still looks right. */
{
  /* a minimal state: only the fields these two functions read. `race` resolves
     through RACES (falling back to human) and `cls` is null, so `flatBonus`
     contributes only the race's own crime bonus — the same 0 for every case. */
  const mkState = (gear) => ({ race:'human', cls:null, gear, skills:{ stealth:0 },
                               attrs:{ finesse:0, might:0 }, underworld:{ heat:0 } });

  const bare = { weapon:{ key:'dagger', plus:0, rarity:'common', affix:[] },
                 offhand:{ key:null, plus:0, rarity:'common', affix:[] },
                 helmet:{ key:null, plus:0, rarity:'common', affix:[] },
                 boots:{ key:null, plus:0, rarity:'common', affix:[] } };
  const shadowed = { weapon:{ key:'twin_dagger', plus:0, rarity:'legendary', affix:[] },
                     offhand:{ key:null, plus:0, rarity:'common', affix:[] },
                     helmet:{ key:'hood', plus:0, rarity:'legendary', affix:[] },
                     boots:{ key:'swift_boots', plus:0, rarity:'legendary', affix:[] } };

  const { G } = loadWorld();
  ok('G.crimeChance and G.setBonuses are functions',
     typeof G.crimeChance === 'function' && typeof G.setBonuses === 'function');

  G.state = mkState(bare);
  const base = G.crimeChance();
  G.state = mkState(shadowed);
  const withSet = G.crimeChance();

  ok('the Shadow set\'s +15% crime actually reaches crimeChance',
     Math.abs((withSet - base) - 0.15) < 1e-9,
     `bare ${base.toFixed(2)} -> three pieces ${withSet.toFixed(2)} (delta ${(withSet - base).toFixed(2)})`);

  // and the Duelist pair is a pair that can be worn at once: two distinct slots
  const duel = G.GEAR_SETS.duelist;
  const duelSlots = new Set(duel.pieces.map(p => G.GEAR[p].slot));
  ok('the Duelist set\'s pieces occupy distinct slots', duelSlots.size === duel.pieces.length,
     duel.pieces.map(p => `${p}=${G.GEAR[p].slot}`).join(', '));

  G.state = mkState({ weapon:{ key:'katana', plus:0, rarity:'common', affix:[] },
                      offhand:{ key:'dagger2', plus:0, rarity:'common', affix:[] },
                      helmet:{ key:null, plus:0, rarity:'common', affix:[] },
                      boots:{ key:null, plus:0, rarity:'common', affix:[] } });
  ok('wearing the Duelist pair grants its advertised +8 attack',
     G.setBonuses().atk === 8, 'setBonuses().atk = ' + G.setBonuses().atk);
}

/* ---------- 7. the gate is not vacuous, and it catches the right thing ----------
   Each breakage is one set in its own sandbox. A validator that always says
   "clean" fails every one of these. */
const setBreakages = [
  ['a set grants a bonus nothing in the engine reads', G => {
    G.GEAR_SETS.ironclad.b2 = { strength:6 };
  }],
  ['a set needs a piece that is not gear', G => {
    G.GEAR_SETS.ironclad.pieces = ['iron_plate','no_such_helm','plated_boots'];
  }],
  ['a set tier needs more pieces than it has slots', G => {
    G.GEAR_SETS.ironclad.pieces = ['iron_plate','iron_helm'];
    G.GEAR_SETS.ironclad.b3 = { hp:60 };            // 3 pieces, 2 slots
  }],
  ['one item is claimed by two sets', G => {
    G.GEAR_SETS.duelist.pieces = ['katana','iron_helm'];
  }],
  ['a gem grants a stat the totals do not carry', G => {
    G.GEMS.ruby.stat = 'charisma';
  }],
];

for (const [what, mutate] of setBreakages) {
  const { G } = loadWorld(mutate);
  let r;
  try { r = G.validateContent(); } catch (e) { r = { errors: [], warnings: [], threw: e.message }; }
  ok('the validator catches: ' + what, !r.threw && r.errors.length > 0,
     r.threw ? 'threw: ' + r.threw : r.errors.length + ' error(s)');
}

/* ---------- 8. companion behaviours: a word the engine does not know ----------
   `G.companionTurn` dispatches on `def.behaviour` and its last branch is a plain
   strike, so `behaviour:"Heal"` healed nobody, threw nothing and looked like a
   design choice while the recruit panel kept promising "Heals you when you fall
   below half health". These assertions call the real `companionTurn` with the
   combat helpers stubbed, so a fix that only adds a validator rule fails them. */

/* a one-companion fight: enough state for companionTurn and nothing more */
function fight(behaviour, { hp = 40, maxHp = 100, enemyDef = 5, declared = true } = {}) {
  const { G, ctx: fightCtx } = loadWorld();
  const log = [];
  const def = { id:'tester', name:'Tester', emoji:'✨', atk:1 };
  if (declared) def.behaviour = behaviour;
  G.COMPANIONS.push(def);
  const state = {
    hp,
    gold: 0, stats: { goldEarned: 0 },
    companions: [{ id:'tester', hp:50, maxHp:50, downed:false }],
    activeCompanion: 'tester',
    combat: { enemies: [{ name:'Wolf', hp:200, def:enemyDef, status:{}, alive:true }], companionGuard:false },
  };
  G.state = state;
  G.maxHp = () => maxHp;
  G.atkPower = () => 10;
  G.spellPower = () => 0;
  G.clog = (msg, cls) => log.push({ msg, cls });
  G.floatText = () => {};
  G.applyStatus = (status, key) => { status[key] = { turns:2, dmg:0 }; };
  G.killEnemy = (e) => { e.alive = false; };
  G.activeEnemies = () => state.combat.enemies.filter(e => e.alive);
  return { G, state, log, ctx: fightCtx };
}

{
  const { G } = loadWorld();
  ok('G.companionBehaviour and G.COMPANION_BEHAVIOURS exist',
     typeof G.companionBehaviour === 'function' && Array.isArray(G.COMPANION_BEHAVIOURS),
     (G.COMPANION_BEHAVIOURS || []).join(', '));

  const shipped = G.COMPANIONS || [];
  const unresolved = shipped.filter(c => !G.companionBehaviour(c).known).map(c => `${c.id}:${c.behaviour}`);
  ok('every shipped companion declares a behaviour the engine implements', unresolved.length === 0,
     unresolved.length ? 'unknown: ' + unresolved.join(', ') : shipped.length + ' companions');

  // the drift guard: the vocabulary the engine dispatches on is the vocabulary the
  // validator accepts — every engine word validates clean, and a word outside it
  // does not. (The validator keeps its own copy because it must run without this file.)
  const rejected = G.COMPANION_BEHAVIOURS.filter(b => {
    const { G: G2 } = loadWorld(G2x => { G2x.COMPANIONS.push({ id:'probe_' + b, name:'P', behaviour:b }); });
    return G2.validateContent().errors.some(e => e.where.indexOf('probe_' + b) >= 0);
  });
  ok('the validator accepts every behaviour the engine implements', rejected.length === 0,
     rejected.length ? 'refused: ' + rejected.join(', ') : G.COMPANION_BEHAVIOURS.length + ' behaviours');
}

/* a heal companion heals when you are below half, and strikes when you are not */
{
  const hurt = fight('heal', { hp: 40, maxHp: 100 });
  hurt.G.companionTurn();
  ok('a "heal" companion mends you below half health', hurt.state.hp === 58,
     `hp 40 -> ${hurt.state.hp} (expected 58)`);
  ok('the heal is logged as a heal', hurt.log.some(l => /mends/.test(l.msg)), hurt.log.map(l => l.msg).join(' | '));

  const whole = fight('heal', { hp: 90, maxHp: 100 });
  whole.G.companionTurn();
  ok('a "heal" companion above half health strikes instead of wasting the turn',
     whole.state.hp === 90 && whole.state.combat.enemies[0].hp < 200,
     `hp ${whole.state.hp}, enemy ${whole.state.combat.enemies[0].hp}`);
}

/* a guard companion raises the guard flag; a typo does not get the guard's odds */
{
  const g = fight('guard');
  g.G.companionTurn();
  ok('a "guard" companion sets companionGuard', g.state.combat.companionGuard === true);

  const typo = fight('Guard');
  typo.G.companionTurn();
  ok('a mis-cased "Guard" does not buy the guard behaviour', typo.state.combat.companionGuard === false);
  ok('and it is named in the combat log', typo.log.some(l => /does not implement/.test(l.msg)),
     typo.log.map(l => l.msg).join(' | '));

  // once per companion, not once per round: a warning repeated every turn is noise
  typo.G.companionTurn();
  const warnings = typo.log.filter(l => /does not implement/.test(l.msg)).length;
  ok('the warning is said once per companion, not every round', warnings === 1, warnings + ' warning(s)');
}

/* the intercept odds follow the RESOLVED behaviour: a typo must not buy 0.45 */
{
  const vm = require('vm');
  // Math.random pinned to 0.3 from inside the sandbox: 0.3 >= 0.2 (an ordinary
  // companion's chance, no intercept) but 0.3 < 0.45 (the guard's, intercepts).
  const guard = fight('guard');
  vm.runInContext('Math.random = () => 0.3;', guard.ctx);
  const guarded = guard.G.companionIntercept(20);
  ok('a "guard" companion intercepts a blow that an ordinary one would not',
     guarded === true && guard.state.companions[0].hp < 50,
     `intercepted=${guarded}, companion hp ${guard.state.companions[0].hp}`);

  const typo = fight('Guard');
  vm.runInContext('Math.random = () => 0.3;', typo.ctx);
  const typoHit = typo.G.companionIntercept(20);
  ok('a mis-cased "Guard" does not intercept at the guard\'s odds', typoHit === false,
     'intercepted=' + typoHit);

  const plain = fight('strike');
  vm.runInContext('Math.random = () => 0.3;', plain.ctx);
  ok('an ordinary companion leaves that blow to you', plain.G.companionIntercept(20) === false);
}

/* an unknown behaviour still fights — it must not do nothing at all */
{
  const t = fight('healer');
  t.G.companionTurn();
  ok('an unknown behaviour still lands a strike', t.state.combat.enemies[0].hp < 200,
     'enemy hp ' + t.state.combat.enemies[0].hp);

  const none = fight('strike', { declared: false });
  none.G.companionTurn();
  ok('a companion that declares no behaviour fights as a plain strike, without a warning',
     none.state.combat.enemies[0].hp < 200 && !none.log.some(l => /does not implement/.test(l.msg)));
}

/* ---------- 9. the companion checks are not vacuous ---------- */
const compBreakages = [
  ['a companion declares a behaviour the engine does not implement', G => {
    G.COMPANIONS[0].behaviour = 'Heal';
  }],
  ['two companions share an id', G => {
    G.COMPANIONS[1].id = G.COMPANIONS[0].id;
  }],
];

for (const [what, mutate] of compBreakages) {
  const { G } = loadWorld(mutate);
  let r;
  try { r = G.validateContent(); } catch (e) { r = { errors: [], warnings: [], threw: e.message }; }
  ok('the validator catches: ' + what, !r.threw && r.errors.length > 0,
     r.threw ? 'threw: ' + r.threw : r.errors.map(e => e.msg).join(' | ') || '0 error(s)');
}

{
  // a missing behaviour is a NOTE, not an error: strike is a legitimate default
  const { G } = loadWorld(G2x => { delete G2x.COMPANIONS[0].behaviour; });
  const r = G.validateContent();
  ok('a companion with no behaviour is a warning, not an error',
     r.errors.length === 0 && r.warnings.some(w => /behaviour/.test(w.msg)),
     `${r.errors.length} error(s), ${r.warnings.length} warning(s)`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
