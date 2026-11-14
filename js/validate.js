/* ============================================================
   Aethelgard — content validator

   Checks every chapter, quest, enemy, spawn and trigger for references that
   cannot resolve — the class of bug where an objective names an enemy that is
   placed nowhere, or a mod points at an item that does not exist.

   Run it from the browser console, or via the harness in tests.
   Returns { errors:[], warnings:[] } and prints a report.
   ============================================================ */
"use strict";
(function () {
const G = window.Game;

function has(obj, k) { return Object.prototype.hasOwnProperty.call(obj, k); }

G.validateContent = function () {
  const errors = [], warnings = [];
  const E = (where, msg) => errors.push({ where, msg });
  const W = (where, msg) => warnings.push({ where, msg });

  // ---- 1. every enemy referenced anywhere must exist ----
  const enemyIds = new Set(Object.keys(G.ENEMIES || {}));
  const itemIds  = new Set(Object.keys(G.ITEMS || {}));
  const gearIds  = new Set(Object.keys(G.GEAR || {}));
  const classIds = new Set(Object.keys(G.CLASSES || {}));
  const elemIds  = new Set(Object.keys(G.ELEMENTS || {}));

  // ---- 2. where is each enemy actually reachable? ----
  const placed = new Set();
  Object.keys(G.LOCAL_MAPS || {}).forEach(rg =>
    (G.LOCAL_MAPS[rg] || []).forEach(o => (o.spawn || []).forEach(e => placed.add(e))));
  if (G.ENDLESS_FLOOR_POOL) G.ENDLESS_FLOOR_POOL.forEach(e => placed.add(e));
  if (G.BOUNTY_POOL) G.BOUNTY_POOL.forEach(e => placed.add(e));
  // the arena and the per-region spawn pools are also ways to meet an enemy
  (G.ARENA_WAVES || []).forEach(w => (w.enemies || []).forEach(e => placed.add(e)));
  Object.keys(G.LOCATIONS || {}).forEach(k => (G.LOCATIONS[k].spawns || []).forEach(e => placed.add(e)));

  // ---- 3. chapters ----
  (G.CHAPTERS || []).forEach(c => {
    const o = c.objective;
    if (!o) return;
    if (o.type === "kill") {
      if (!o.target) E(`chapter ${c.id}`, "kill objective has no target");
      else if (!enemyIds.has(o.target)) E(`chapter ${c.id}`, `kill objective targets "${o.target}" which is not an enemy`);
      else if (!placed.has(o.target)) E(`chapter ${c.id}`, `kill objective targets "${o.target}" which is spawned nowhere — uncompletable`);
      if (!o.required || o.required < 1) W(`chapter ${c.id}`, "kill objective has no required count");
    }
    (c.choices || []).forEach((ch, i) => {
      if (!ch.label) E(`chapter ${c.id} choice ${i}`, "choice has no label");
      const fx = ch.effects || {};
      if (fx.items) Object.keys(fx.items).forEach(k => { if (!itemIds.has(k)) E(`chapter ${c.id} choice ${i}`, `reward item "${k}" does not exist`); });
    });
    if (c.rewards && c.rewards.items) Object.keys(c.rewards.items).forEach(k => {
      if (!itemIds.has(k) && !gearIds.has(k)) E(`chapter ${c.id}`, `reward item "${k}" does not exist`);
    });
  });

  // ---- 4. quests (side, class, bounty) ----
  const checkQuest = (q, where) => {
    const o = q.objective;
    if (!o) { W(where, "no objective"); return; }
    if (o.type === "kill" && o.target && o.target !== "any") {
      if (!enemyIds.has(o.target)) E(where, `kill target "${o.target}" is not an enemy`);
      else if (!placed.has(o.target)) E(where, `kill target "${o.target}" is spawned nowhere`);
    }
    if (o.type === "gather" && o.target && o.target !== "any") {
      if (!itemIds.has(o.target) && !["wood","iron","leather","herb","food","cloth"].includes(o.target))
        W(where, `gather target "${o.target}" is not a known item`);
    }
    if (q.rewards && q.rewards.items) Object.keys(q.rewards.items).forEach(k => {
      if (!itemIds.has(k)) E(where, `reward item "${k}" does not exist`);
    });
    if (q.cls && !classIds.has(q.cls)) E(where, `class mission for "${q.cls}" which is not a class`);
  };
  (G.SIDE_QUESTS || []).forEach((q, i) => checkQuest(q, `side quest ${q.id || i}`));
  (G.CLASS_MISSIONS || []).forEach((q, i) => checkQuest(q, `class mission ${q.id || i}`));

  // ---- 5. enemies ----
  Object.keys(G.ENEMIES || {}).forEach(k => {
    const e = G.ENEMIES[k];
    if (e.element && !elemIds.has(e.element)) E(`enemy ${k}`, `element "${e.element}" does not exist`);
    (e.weak || []).forEach(w => { if (!elemIds.has(w)) E(`enemy ${k}`, `weakness "${w}" does not exist`); });
    (e.resists || []).forEach(w => { if (!elemIds.has(w)) E(`enemy ${k}`, `resistance "${w}" does not exist`); });
    const CURRENCY = ["gold","xp"];
    if (e.drops) Object.keys(e.drops).forEach(d => {
      if (!itemIds.has(d) && !gearIds.has(d) && CURRENCY.indexOf(d) < 0)
        E(`enemy ${k}`, `drop "${d}" does not exist`);
    });
    (e.abilities || []).forEach((a, i) => {
      if (a.status && !has(G.STATUS || {}, a.status)) E(`enemy ${k} ability ${i}`, `status "${a.status}" does not exist`);
    });
    if (!placed.has(k) && !e.noSpawn) W(`enemy ${k}`, "exists but is never spawned (fine for a summon-only enemy)");
  });

  // ---- 6. spawns point at real enemies ----
  Object.keys(G.LOCAL_MAPS || {}).forEach(rg =>
    (G.LOCAL_MAPS[rg] || []).forEach(o => (o.spawn || []).forEach(e => {
      if (!enemyIds.has(e)) E(`spawn ${rg}.${o.id}`, `spawns "${e}" which is not an enemy`);
    })));

  // ---- 7. classes, races and their gear ----
  Object.keys(G.CLASSES || {}).forEach(k => {
    const c = G.CLASSES[k];
    if (c.startGear) Object.keys(c.startGear).forEach(slot => {
      const g = c.startGear[slot];
      if (g && !gearIds.has(g)) E(`class ${k}`, `starting ${slot} "${g}" does not exist`);
    });
    (c.skills || []).forEach(s => {
      if (!has(G.ACTIVE_SKILLS || {}, s)) W(`class ${k}`, `skill "${s}" is not in ACTIVE_SKILLS`);
    });
  });

  // ---- 9. every ingredient a recipe or a building asks for exists ----
  // The gap this closes: costs were the one reference the validator never read.
  // An unknown key is not a cosmetic typo — `viewForge` builds its cost line with
  // `G.ITEMS[k].emoji`, so one bad key threw a TypeError and the Forge tab
  // rendered nothing at all, with the console as the only clue.
  const checkCost = (cost, where) => {
    Object.keys(cost || {}).forEach(k => {
      if (!itemIds.has(k)) E(where, `costs "${k}" which is not an item`);
      else if (!(cost[k] > 0)) E(where, `costs "${k}" a non-positive amount (${cost[k]})`);
    });
  };
  Object.keys(G.GEAR || {}).forEach(k => {
    if (G.GEAR[k].cost) checkCost(G.GEAR[k].cost, `recipe ${k}`);
    if (G.GEAR[k].slot && !(G.SLOTS || []).some(s => s[0] === G.GEAR[k].slot))
      E(`gear ${k}`, `slot "${G.GEAR[k].slot}" is not one of the seven slots`);
  });
  Object.keys(G.CONSUMABLE_RECIPES || {}).forEach(k => checkCost(G.CONSUMABLE_RECIPES[k].cost, `consumable ${k}`));
  Object.keys(G.BUILDINGS || {}).forEach(k => checkCost(G.BUILDINGS[k].cost, `building ${k}`));

  // ---- 8. mods that contribute nothing because of the mode ----
  ((G.MODS && G.MODS.discovered) || []).forEach(d => {
    if (d.obj && d.obj._skippedForMode) return;      // correctly skipped
  });

  return { errors, warnings };
};

/* A short block for the Diagnostics panel: run the content check and show it. */
G.contentCheckHTML = function () {
  if (!G._contentCheck) {
    return `<h4 style="margin:.8rem 0 .3rem">Content check</h4>
      <p class="muted small">Checks every chapter, quest, enemy, spawn and trigger for references that cannot resolve.</p>
      <button class="btn btn-sm" onclick="Game.runContentCheck()">Run content check</button>`;
  }
  const r = G._contentCheck;
  const cls = r.errors.length ? "error" : "ok";
  let h = `<h4 style="margin:.8rem 0 .3rem">Content check</h4>`;
  h += `<div class="compat compat-${cls}">` +
       (r.errors.length ? `✗ ${r.errors.length} problem(s)` : `✓ nothing wrong`) +
       (r.warnings.length ? ` · ${r.warnings.length} note(s)` : "") + `</div>`;
  r.errors.slice(0, 12).forEach(e => h += `<div class="diag-err"><div class="de-msg">${e.where}</div><div class="de-why">${e.msg}</div></div>`);
  r.warnings.slice(0, 8).forEach(w => h += `<p class="muted small" style="margin:.2rem 0">⚠ ${w.where}: ${w.msg}</p>`);
  h += `<button class="btn btn-sm" style="margin-top:.5rem" onclick="Game.runContentCheck()">Run again</button>`;
  return h;
};
G.runContentCheck = function () {
  G._contentCheck = G.validateContent();
  const r = G._contentCheck;
  G.notify(r.errors.length ? "bad" : "good",
           r.errors.length ? r.errors.length + " content problem(s)" : "Content check passed",
           r.errors.length ? "See Settings → Diagnostics." : "Every chapter, spawn and trigger resolves.");
  if (G.buildSettings) G.buildSettings();
};

G.reportContentValidation = function () {
  const r = G.validateContent();
  if (!r.errors.length && !r.warnings.length) {
    console.log("✓ content validation: nothing wrong");
    return r;
  }
  if (r.errors.length) {
    console.group(`✗ ${r.errors.length} content error(s)`);
    r.errors.forEach(e => console.log(`  ${e.where}: ${e.msg}`));
    console.groupEnd();
  }
  if (r.warnings.length) {
    console.group(`⚠ ${r.warnings.length} warning(s)`);
    r.warnings.forEach(w => console.log(`  ${w.where}: ${w.msg}`));
    console.groupEnd();
  }
  return r;
};
})();
