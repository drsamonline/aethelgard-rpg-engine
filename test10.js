/* Regression test: the IMPORT path must refuse what the LOADER refuses.

   Import used to accept anything `JSON.parse` could produce and that carried a
   `level` field: `{"level":"seven"}` was "imported", written over a slot and
   announced as success — and then `loadSlot()` refused it on the next boot,
   because `validSave()` demands a numeric level and an `attrs` object. The
   player lost the slot they overwrote and got no warning at the time.

   Two more silent paths are pinned here with it:
     - importing a save from the OTHER game (each mode keeps its own slots, so
       the loader refuses it by design) also reported success;
     - a refused import on the title screen showed NOTHING, because `notify()`
       returns early when there is no live `G.state` yet.

   The suite loads the real `js/core.js` in a sandbox with a minimal browser
   shim, so it tests the shipped file rather than a copy of its logic.

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

/* ---------- a browser, small enough to fit in a test ---------- */
function makeWorld() {
  const store = new Map();
  const toasts = [];
  const el = () => ({
    children: [], classList: { add() {}, remove() {}, toggle() {} },
    style: {}, className: '', textContent: '', innerHTML: '',
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { this.children = this.children.filter(x => x !== c); },
    remove() {}, setAttribute() {}, addEventListener() {},
  });
  const document = {
    documentElement: { lang: '', style: {} },
    body: { classList: { add() {}, remove() {}, toggle() {} }, className: '', appendChild() {}, removeChild() {} },
    getElementById: () => el(),
    createElement: () => el(),
    querySelector: () => el(),
    querySelectorAll: () => [],
    addEventListener() {},
  };
  const localStorage = {
    get length() { return store.size; },
    key: i => Array.from(store.keys())[i] ?? null,
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: k => { store.delete(k); },
    clear: () => store.clear(),
  };
  const Game = { GAME_VERSION: '1.0.0' };
  const win = {
    Game, document, localStorage,
    console, setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {},
    Math, Date, JSON, Object, Array, String, Number, Boolean, Promise, Error,
    requestAnimationFrame: () => 0, location: { reload() {} },
    navigator: { language: 'en' }, screen: { width: 1280, height: 800 },
    Audio: function () { return { play() {}, pause() {}, addEventListener() {} }; },
    AudioContext: function () { return { createGain: () => ({ connect() {}, gain: { value: 0 } }), destination: {} }; },
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
    Blob: function () {},
    btoa: s => Buffer.from(s, 'binary').toString('base64'),
    atob: s => Buffer.from(s, 'base64').toString('binary'),
    escape: global.escape, unescape: global.unescape,
    decodeURIComponent, encodeURIComponent,
    prompt: () => null, alert() {},
    devicePixelRatio: 1, innerWidth: 1280, innerHeight: 800,
  };
  win.window = win;
  win.globalThis = win;
  return { win, Game, store, toasts };
}

function loadCore() {
  const world = makeWorld();
  const src = fs.readFileSync(path.join(__dirname, 'js', 'core.js'), 'utf8');
  vm.createContext(world.win);
  // G.toast writes into #toasts through getElementById, which the shim returns a
  // fresh element for; record what the game TRIED to say instead.
  vm.runInContext(src, world.win, { filename: 'js/core.js' });
  const G = world.Game;
  const said = [];
  const realToast = G.toast;
  G.toast = function (msg, kind) { said.push({ msg, kind }); };
  G._said = said;
  G._realToast = realToast;
  // the start screen is not what this suite is about: it renders i18n text into
  // the DOM, and the DOM here is four stub elements. Import calls it, so stub it.
  G.renderStart = function () {};
  G.settings.mode = 'chronicles';
  G.MODES.villain = Object.assign({ classes: null }, { id: 'villain', name: "The Crown's Shadow" });
  return G;
}

/* ---------- 1. saveProblems() exists and tells the truth ---------- */
{
  const G = loadCore();
  ok('core.js defines saveProblems()', typeof G.saveProblems === 'function');

  const good = G.defaultState(1, 'normal');
  ok('a fresh default state has no problems', Array.isArray(G.saveProblems(good)) && G.saveProblems(good).length === 0,
     JSON.stringify(G.saveProblems(good)));

  const bad = [
    [null, 'null'],
    [undefined, 'undefined'],
    ['a string', 'a string'],
    [42, 'a number'],
    [[], 'an array'],
    [{}, 'an empty object'],
    [{ level: 'seven', attrs: {} }, 'level is a string'],
    [{ level: 3 }, 'no attrs'],
    [{ level: 3, attrs: null }, 'attrs is null'],
    [{ level: NaN, attrs: {} }, 'level is NaN'],
    [{ level: 3, attrs: [], }, 'attrs is an array'],
    [{ level: 3, attrs: {}, modeId: 7 }, 'modeId is not a string'],
  ];
  bad.forEach(([s, label]) => {
    const p = G.saveProblems(s);
    ok('saveProblems rejects ' + label, Array.isArray(p) && p.length > 0, (p || []).join('; ').slice(0, 60));
  });

  ok('validSave agrees with saveProblems on a good state', G.validSave(good) === true);
  ok('validSave agrees with saveProblems on a bad state', G.validSave({ level: 'seven', attrs: {} }) === false);
}

/* ---------- 2. import refuses what the loader would refuse ---------- */
{
  const G = loadCore();
  G.settings.mode = 'chronicles';
  G.store.init();

  const before = G.store.keys().length;
  const r1 = G.importSaveData({ level: 'seven', attrs: {} });
  ok('importSaveData refuses a string level', r1 === null || r1 === undefined, 'returned ' + r1);
  ok('the refusal wrote nothing', G.store.keys().length === before, 'keys=' + G.store.keys().length);
  ok('the refusal was announced', G._said.length > 0, G._said.map(s => s.msg).join(' | ').slice(0, 90));

  const r2 = G.importSaveData({ level: 4 });          // parses, but no attrs
  ok('importSaveData refuses a save with no attributes', r2 === null || r2 === undefined, 'returned ' + r2);

  // the one that matters: whatever import ACCEPTS, loadSlot must return
  const good = G.defaultState(1, 'normal');
  good.name = 'Imported Hero';
  const slot = G.importSaveData(JSON.parse(JSON.stringify(good)));
  ok('importSaveData accepts a real save', typeof slot === 'number', 'slot=' + slot);
  const back = G.loadSlot(slot);
  ok('loadSlot returns what import accepted', !!back && back.name === 'Imported Hero', back && back.name);
}

/* ---------- 3. a save from the other game is refused, not swallowed ---------- */
{
  const G = loadCore();
  G.settings.mode = 'villain';                        // the other game is active
  G.store.init();
  const chron = G.defaultState(1, 'normal');          // a Chronicles save
  chron.modeId = 'chronicles';
  chron.name = 'Chronicles Hero';
  const before = G.store.keys().length;
  const r = G.importSaveData(JSON.parse(JSON.stringify(chron)));
  ok("import refuses the other game's save", r === null || r === undefined, 'returned ' + r);
  ok('nothing was written for it', G.store.keys().length === before, 'keys=' + G.store.keys().length);
  ok('the refusal names the game', G._said.some(s => /chronicles|crown|game|mode/i.test(s.msg || '')),
     G._said.map(s => s.msg).join(' | ').slice(0, 120));

  // and the same save imports cleanly into its own game
  G.settings.mode = 'chronicles';
  const ok2 = G.importSaveData(JSON.parse(JSON.stringify(chron)));
  ok('the same save imports into its own game', typeof ok2 === 'number', 'slot=' + ok2);
  ok('and loads back', (G.loadSlot(ok2) || {}).name === 'Chronicles Hero');
}

/* ---------- 4. a refusal is VISIBLE before there is a live state ---------- */
{
  const G = loadCore();
  G.settings.mode = 'chronicles';
  G.store.init();
  G.state = null;                                    // the title screen: no game yet
  G.importSaveData({ level: 'seven', attrs: {} });
  ok('a refused import on the title screen still says something',
     G._said.length > 0, G._said.map(s => s.msg).join(' | ').slice(0, 90));
}

/* ---------- 5. parseSaveText keeps its documented shapes ---------- */
{
  const G = loadCore();
  const state = G.defaultState(1, 'normal');
  const wrapped = JSON.stringify(G.wrapSave(state));
  ok('parseSaveText reads the exported wrapper', (G.parseSaveText(wrapped) || {}).level === state.level);
  ok('parseSaveText reads a bare state', (G.parseSaveText(JSON.stringify(state)) || {}).level === state.level);
  const b64 = Buffer.from(JSON.stringify(state), 'binary').toString('base64');
  ok('parseSaveText reads the old base64 form', (G.parseSaveText(b64) || {}).level === state.level);
  ok('parseSaveText refuses junk', G.parseSaveText('not a save at all') === null);
  ok('parseSaveText refuses an empty string', G.parseSaveText('   ') === null);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
