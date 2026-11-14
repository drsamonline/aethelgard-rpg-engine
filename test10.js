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
  run('js/world.js');
  // 3. the validator itself
  run('js/validate.js');

  const G = ctx.window.Game;
  if (mutate) mutate(G);
  return { G, dataFiles };
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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
