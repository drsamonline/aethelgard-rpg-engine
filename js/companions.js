/* ============================================================
   Aethelgard — COMPANIONS: recruit allies who fight beside you
   Created by Dr. Sohil Momin
   ============================================================ */
"use strict";
(function () {
const G = window.Game;

/* ---------- the behaviours combat actually implements ----------
   ONE list. `G.companionTurn` dispatches on it and the content validator
   (js/validate.js, section 12) checks every companion against it, so a new
   behaviour cannot be added to the engine and forgotten by the check. The
   validator keeps its own copy of the names — it has to run without this file —
   and test10.js asserts the two lists are equal, which is what stops the drift. */
G.COMPANION_BEHAVIOURS = ["strike", "heal", "guard", "hex", "steal"];

/* Resolve a companion's `behaviour` field.
   * missing/blank -> "strike", which is what the else-branch always did;
   * a known word   -> that word;
   * anything else  -> "strike" AND known:false, so the caller can SAY so.
   Before this, an unknown word fell through the if-chain into the plain-strike
   branch and the companion quietly lost its whole point: a `behaviour:"Heal"`
   typo healed nobody, threw nothing, and looked like a design choice. */
G.companionBehaviour = function (def) {
  const raw = def && def.behaviour;
  if (raw === undefined || raw === null || raw === "") return { behaviour:"strike", known:true, declared:false };
  if (G.COMPANION_BEHAVIOURS.indexOf(raw) >= 0) return { behaviour:raw, known:true, declared:true };
  return { behaviour:"strike", known:false, declared:true, raw:String(raw) };
};

G.compDef = function (id) { return G.COMPANIONS.find(c => c.id === id); };
G.compState = function (id) { return G.state.companions.find(c => c.id === id); };
G.recruited = function (id) { return !!G.compState(id); };
G.activeComp = function () {
  const id = G.state.activeCompanion; if (!id) return null;
  const st = G.compState(id); if (!st || st.downed) return null;
  return { def:G.compDef(id), st };
};
G.compMaxHp = function (def) { return Math.round(G.maxHp() * (def.hpMult || 1) * 0.8); };

G.canRecruit = function (def) {
  const p = G.state;
  if (G.recruited(def.id)) return false;
  const r = def.recruit || {};
  if (r.level && p.level < r.level) return false;
  if (r.rep) for (const f in r.rep) if ((p.reputation[f]||0) < r.rep[f]) return false;
  if (r.flag) { const [k,v] = r.flag.split("="); if (String(p.flags[k]) !== v) return false; }
  return true;
};
G.recruitReqText = function (def) {
  const r = def.recruit || {}, out = [];
  if (r.level) out.push(`level ${r.level}`);
  if (r.rep) for (const f in r.rep) out.push(`${f} reputation ${r.rep[f]}`);
  if (r.flag) { const [k,v] = r.flag.split("="); out.push(`story choice: ${k}=${v}`); }
  return out.length ? out.join(" · ") : "no requirement";
};
G.recruitCompanion = function (id) {
  const p = G.state, def = G.compDef(id);
  if (!def || !G.canRecruit(def)) { G.notify("warning", "Not available yet", "Meet the recruitment requirement first."); return; }
  const cost = (def.cost && def.cost.gold) || 0;
  if (p.gold < cost) { G.notify("warning", `Needs ${cost} gold`, ""); return; }
  p.gold -= cost;
  const maxHp = G.compMaxHp(def);
  p.companions.push({ id, hp:maxHp, maxHp, loyalty:50, downed:false });
  p.stats.companionsRecruited++;
  if (!p.activeCompanion) p.activeCompanion = id;
  G.log(`🤝 ${def.name} joins you.`);
  G.notify("good", `${def.name} joined!`, def.perk);
  G.Sound.play("victory");
  G.checkAchievements();
  G.render();
};
G.setActiveCompanion = function (id) {
  const p = G.state;
  if (id && !G.recruited(id)) return;
  p.activeCompanion = id;
  G.notify("info", id ? "Companion set" : "Companion dismissed", id ? G.compDef(id).name : "");
  G.render();
};
G.dismissCompanion = function (id) {
  const p = G.state;
  p.companions = p.companions.filter(c => c.id !== id);
  if (p.activeCompanion === id) p.activeCompanion = p.companions.length ? p.companions[0].id : null;
  G.log(`👋 ${G.compDef(id).name} leaves your company.`);
  G.render();
};
G.reviveCompanions = function () {
  G.state.companions.forEach(c => { if (c.downed) { c.downed = false; c.hp = Math.round(c.maxHp * 0.5); } });
};

/* ---------- companion acts each round, after you ---------- */
G.companionTurn = function () {
  const act = G.activeComp(); if (!act) return;
  const { def, st } = act, p = G.state, c = p.combat;
  const foes = G.activeEnemies(); if (!foes.length) return;
  const target = G.pick(foes);
  const power = (G.atkPower() * def.atk * 0.75 + (def.spell ? G.spellPower() * def.spell * 0.5 : 0));
  let dmg = Math.max(1, Math.round(power * G.roll(0.25) - target.def * 0.4));

  // an unknown behaviour is named once per companion, not once per round:
  // a combat log that repeats the same warning every turn is noise, and silence
  // is what let the typo ship in the first place.
  const resolved = G.companionBehaviour(def);
  if (!resolved.known) {
    G._compBehaviourWarned = G._compBehaviourWarned || {};
    if (!G._compBehaviourWarned[def.id]) {
      G._compBehaviourWarned[def.id] = true;
      G.clog(`⚠ ${def.name} declares behaviour "${resolved.raw}", which the engine does not implement — striking plainly instead.`, "cl-bad");
    }
  }
  const behaviour = resolved.behaviour;

  if (behaviour === "heal") {
    if (p.hp < G.maxHp() * 0.5) {
      const heal = Math.round(G.maxHp() * 0.18);
      p.hp = Math.min(G.maxHp(), p.hp + heal);
      G.clog(`✨ ${def.name} mends your wounds (+${heal} HP).`, "cl-good");
      G.floatText("+" + heal, "ft-heal");
    } else { target.hp -= dmg; G.clog(`✨ ${def.name} strikes ${target.name} for ${dmg}.`, "cl-good"); }
  } else if (behaviour === "guard") {
    c.companionGuard = true;
    target.hp -= dmg;
    G.clog(`🛡️ ${def.name} guards you and hits ${target.name} for ${dmg}.`, "cl-good");
  } else if (behaviour === "hex") {
    target.hp -= dmg;
    G.applyStatus(target.status, "weaken", 0, 2);
    G.clog(`🔮 ${def.name} hexes ${target.name} for ${dmg} and weakens it.`, "cl-good");
  } else if (behaviour === "steal") {
    target.hp -= dmg;
    const g = G.rndInt(4, 18); p.gold += g; p.stats.goldEarned += g;
    G.clog(`🎭 ${def.name} cuts ${target.name} for ${dmg} and lifts ${g}g.`, "cl-good");
  } else {
    const crit = Math.random() < (def.crit || 0.1);
    if (crit) dmg = Math.round(dmg * 1.6);
    target.hp -= dmg;
    G.clog(`${def.emoji} ${def.name} ${crit ? "critically " : ""}strikes ${target.name} for ${dmg}.`, crit ? "cl-crit" : "cl-good");
  }
  if (target.hp <= 0) G.killEnemy(target);
};

/* ---------- companion can take a hit meant for you ---------- */
G.companionIntercept = function (dmg) {
  const act = G.activeComp(); if (!act) return false;
  const p = G.state, c = p.combat;
  // reads the RESOLVED behaviour, so a typo cannot buy the guard's 0.45
  const chance = (G.companionBehaviour(act.def).behaviour === "guard" ? 0.45 : 0.2) + (c.companionGuard ? 0.25 : 0);
  if (Math.random() >= chance) return false;
  const { def, st } = act;
  const taken = Math.max(1, Math.round(dmg * 0.8));
  st.hp -= taken;
  G.clog(`🛡️ ${def.name} throws themselves in front of you! (−${taken})`, "cl-good");
  if (st.hp <= 0) { st.hp = 0; st.downed = true; G.clog(`💔 ${def.name} is down!`, "cl-bad"); G.notify("warning", `${def.name} is down`, "They will recover after the battle."); }
  return true;
};
})();
