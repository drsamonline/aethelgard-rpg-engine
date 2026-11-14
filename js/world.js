/* ============================================================
   Aethelgard — WORLD: travel, activities, economy, events
   Created by Dr. Sohil Momin
   ============================================================ */
"use strict";
(function () {
const G = window.Game;

/* ---------- local maps: points of interest per region ---------- */
const LOCAL_MAPS = {
  town: [
    { id:"market",  name:"Market",      emoji:"🏪", x:22, y:30, act:"tab", tab:"market",   desc:"Trade goods and gear." },
    { id:"forge",   name:"Forge",       emoji:"🛠️", x:50, y:22, act:"tab", tab:"forge",    desc:"Craft weapons and armour." },
    { id:"inn",     name:"The Inn",     emoji:"🛏️", x:78, y:32, act:"inn",                 desc:"Rest to restore HP and energy (25g)." },
    { id:"tavern",  name:"Tavern",      emoji:"🍺", x:30, y:62, act:"rumour",              desc:"Buy a rumour for 15g." },
    { id:"arena",   name:"The Arena",   emoji:"🏟️", x:66, y:66, act:"arena",               desc:"Fight waves for gold and glory." },
    { id:"dice",    name:"Dice Den",    emoji:"🎲", x:46, y:86, act:"gamble",              desc:"Wager 20 gold on a roll of the bones." },
    { id:"kitchen", name:"Kitchen",     emoji:"🍳", x:86, y:58, act:"cook",                desc:"Cook meals from fish and food." },
    { id:"board",   name:"Bounty Board",emoji:"📜", x:60, y:44, act:"bounty",              desc:"Take a paid bounty for coin and renown." },
    { id:"farm",    name:"Fields",      emoji:"🌾", x:12, y:82, act:"farm",                desc:"Tend crops (needs a Farm)." },
    { id:"gate",    name:"Town Gate",   emoji:"🚪", x:88, y:84, act:"world",               desc:"Leave town — open the world map." },
  ],
  wilds: [
    { id:"wood",    name:"Timber Grove", emoji:"🪵", x:20, y:34, act:"gather", res:"wood", cost:5, desc:"Chop wood." },
    { id:"fish",    name:"Shallows",     emoji:"🎣", x:46, y:66, act:"fish",               desc:"Catch fish." },
    { id:"forage",  name:"Thickets",     emoji:"🌿", x:74, y:70, act:"forage",             desc:"Forage for herbs." },
    { id:"beast",    name:"Beast Den",     emoji:"🐺", x:74, y:26, act:"hunt", spawn:["beast"],             desc:"Hunt wolves." },
    { id:"imp",  name:"Imp Camp",  emoji:"👺", x:24, y:78, act:"hunt", spawn:["imp","imp"], desc:"Hunt goblins." },
    { id:"bog",     name:"Bog Heart",    emoji:"🦠", x:50, y:14, act:"hunt", spawn:["bog_horror"], boss:true, desc:"Face the Bog Horror (boss)." },
    { id:"coven",   name:"Cult Sanctum",emoji:"🕯️", x:88, y:40, act:"hunt", spawn:["coven"], boss:true, desc:"Face the Cult Leader (boss)." },
  ],
  caves: [
    { id:"descend", name:"Cave Mouth",   emoji:"🕳️", x:50, y:40, act:"dungeon",            desc:"Descend into the dark." },
    { id:"leave",   name:"Exit",         emoji:"🚪", x:14, y:78, act:"world",              desc:"Return to the world map." },
  ],
  peaks: [
    { id:"mine",    name:"Ore Seam",     emoji:"⛏️", x:22, y:30, act:"gather", res:"iron", cost:8, desc:"Mine iron." },
    { id:"prospect",name:"Deep Seams",   emoji:"💠", x:50, y:20, act:"prospect",           desc:"Search for gems." },
    { id:"bandits", name:"Brigand Trail", emoji:"🗡️", x:76, y:52, act:"hunt", spawn:["brigand"],           desc:"Hunt bandits." },
    { id:"ogres",   name:"Ogre Cave",    emoji:"👹", x:34, y:74, act:"hunt", spawn:["ogre"],             desc:"Hunt ogres." },
    { id:"harpy",   name:"Cliff Nests",  emoji:"🦅", x:74, y:18, act:"hunt", spawn:["harpy"],            desc:"Hunt harpies." },
  ],
  shrine: [
    { id:"pray",    name:"Altar",        emoji:"🙏", x:50, y:44, act:"pray",               desc:"Full restoration (40g)." },
    { id:"leave",   name:"Exit",         emoji:"🚪", x:16, y:80, act:"world",              desc:"Return to the world map." },
  ],
  camp: [
    { id:"bandits", name:"Camp Perimeter",emoji:"🗡️", x:26, y:34, act:"hunt", spawn:["brigand","brigand"], desc:"Raid the bandits." },
    { id:"mage",    name:"Mage's Tent",  emoji:"🧙", x:70, y:30, act:"hunt", spawn:["mage"],        desc:"Hunt the rogue mage." },
    { id:"warlord", name:"Warlord's Hall",emoji:"⚔️", x:50, y:74, act:"hunt", spawn:["warlord"], boss:true, desc:"Face the Brigand Warlord (boss)." },
  ],
  depths: [
    { id:"descend", name:"Descend",  emoji:"🕳️", x:34, y:44, act:"endless", desc:"Descend to the next floor of the Depths." },
    { id:"retreat", name:"Retreat",  emoji:"🚪", x:66, y:60, act:"retreat", desc:"Leave the Depths and bank your rewards." },
    { id:"leave",   name:"Exit",     emoji:"🌍", x:50, y:82, act:"world",   desc:"Return to the world map." },
  ],
  ruins: [
    { id:"wraith",  name:"Flooded Halls",emoji:"👻", x:28, y:30, act:"hunt", spawn:["wraith"],            desc:"Hunt wraiths." },
    { id:"spiders", name:"Webbed Vault", emoji:"🕷️", x:72, y:34, act:"hunt", spawn:["spider","spider"],   desc:"Clear the spiders." },
    { id:"golem",   name:"Stone Court",  emoji:"🗿", x:30, y:76, act:"hunt", spawn:["golem"],             desc:"Hunt a stone golem." },
    { id:"warden",  name:"The Seal",     emoji:"🔒", x:66, y:74, act:"hunt", spawn:["warden"], boss:true, desc:"Face the Iron Guardian (boss)." },
  ],
};
G.LOCAL_MAPS = LOCAL_MAPS;

/* ---------- world map node positions ---------- */
const WORLD_POS = {
  town:{ x:50, y:52 }, wilds:{ x:26, y:74 }, caves:{ x:52, y:20 }, peaks:{ x:78, y:44 },
  shrine:{ x:22, y:30 }, camp:{ x:80, y:74 }, ruins:{ x:14, y:56 }, depths:{ x:50, y:88 },
};
const WORLD_LINKS = [["town","wilds"],["town","caves"],["town","peaks"],["town","shrine"],["town","ruins"],["town","camp"],["wilds","ruins"],["caves","peaks"],["ruins","depths"]];
G.WORLD_POS = WORLD_POS; G.WORLD_LINKS = WORLD_LINKS;

/* ---------- travel ---------- */
G.isUnlocked = function (id) {
  const p = G.state;
  if (p.map.unlocked.indexOf(id) >= 0) return true;
  if ((id === "camp" || id === "depths") && p.mode === "open") return true;
  // a region may declare its own opening condition — a mod-added region needs this
  const l = G.LOCATIONS[id];
  if (l && l.unlock) {
    if (l.unlock.chapter != null && p.story.chapter >= l.unlock.chapter) return true;
    if (l.unlock.level != null && p.level >= l.unlock.level) return true;
    if (l.unlock.flag && p.flags && p.flags[l.unlock.flag]) return true;
  }
  return false;
};
G.travel = function (loc) {
  const p = G.state;
  if (!G.isUnlocked(loc) || p.map.current === loc) return;
  p.map.current = loc;
  if (p.map.visited.indexOf(loc) < 0) { p.map.visited.push(loc); G.progressQuest("explore", "all", 0); G.setQuestProgress("explore", "all", p.map.visited.length); }
  G.log(`🗺️ Travelled to ${G.LOCATIONS[loc].name}.`);
  G.checkAchievements();
  if (p.underworld.heat >= 60 && Math.random() < 0.4) { G.guardShakedown(); G.render(); return; }
  const danger = G.LOCATIONS[loc].danger || 0;
  if (danger > 0 && Math.random() < 0.32) { G.triggerEvent(); return; }
  G.render();
};

/* ---------- resource actions ---------- */
G.gather = function (res, cost, bonus) {
  const p = G.state;
  if (p.energy < cost) { G.notify("warning", "Not enough energy", `Need ${cost}⚡`); G.Sound.play("error"); return; }
  p.energy -= cost;
  let n = G.rndInt(2,4) + Math.floor(p.attrs.might/6) + Math.floor(p.skills.craft/2) + (bonus||0);
  if (G.raceData().mineBonus && (res === "iron" || res === "ore")) n += 2;
  p.inv[res] = (p.inv[res]||0) + n;
  G.log(`🌲 Gathered ${n} ${G.ITEMS[res]?G.ITEMS[res].name:res}.`);
  G.Sound.play("pickup"); G.floatText("+"+n+" "+(G.ITEMS[res]?G.ITEMS[res].emoji:""), "ft-good");
  G.progressQuest("gather", res, n);
  G.checkAchievements(); G.render();
};
G.prospect = function () {
  const p = G.state;
  if (p.energy < 12) { G.notify("warning", "Not enough energy", "Need 12⚡"); return; }
  p.energy -= 12;
  const bonus = G.raceData().mineBonus ? 0.12 : 0;
  if (Math.random() < 0.25 + p.skills.craft*0.05 + bonus) { const n = G.rndInt(1,2); p.inv.ruby = (p.inv.ruby||0)+n; G.log(`💎 Struck a gem vein! +${n} ruby.`); G.notify("good","Gem found!",`+${n} ruby`); G.Sound.play("pickup"); }
  else { const n = G.rndInt(1,3); p.inv.ore = (p.inv.ore||0)+n; G.log(`⛏️ No gems, but ${n} deep ore.`); }
  G.render();
};
G.pray = function () {
  const p = G.state;
  if (p.gold < 40) { G.notify("warning", "Need 40 gold", ""); return; }
  p.gold -= 40; p.hp = G.maxHp(); p.energy = G.maxEnergy(); p.nerve = G.maxNerve();
  G.log("🙏 The shrine's light restores you fully."); G.notify("good","Restored","Fully healed"); G.Sound.play("heal"); G.render();
};
G.restInn = function () {
  const p = G.state;
  if (p.gold < 25) { G.notify("warning", "Need 25 gold", ""); return; }
  p.gold -= 25; p.hp = G.maxHp(); p.energy = G.maxEnergy();
  G.log("🛏️ You rest at the inn."); G.notify("good","Rested","HP and energy restored"); G.Sound.play("heal"); G.render();
};
G.exploreDungeon = function () {
  const p = G.state;
  if (p.energy < 20) { G.notify("warning", "Need 20 energy", ""); G.Sound.play("error"); return; }
  p.energy -= 20;
  if (!p.dungeon.active) { p.dungeon.active = true; p.dungeon.depth = 1; }
  const r = Math.random();
  if (r < 0.66) {
    const id = p.dungeon.depth >= 5 ? G.pick(["wraith","golem"]) : p.dungeon.depth >= 3 ? G.pick(["spider","wraith"]) : p.dungeon.depth >= 2 ? G.pick(["spider","bat"]) : "bat";
    const pack = Math.random() < 0.3 && p.dungeon.depth >= 3 ? [id,id] : [id];
    G.startCombat(pack, { cost:0, depth:p.dungeon.depth, context:"dungeon" });
    return;
  } else if (r < 0.9) {
    let loot = G.pick(["iron","wood","leather","food","herb"]);
    if (Math.random() < 0.22) loot = "ruby";
    if (Math.random() < 0.12) loot = "ore";
    const amt = Math.max(1, Math.round(p.dungeon.depth*(loot==="ruby"||loot==="ore"?1:1.5)));
    p.inv[loot] = (p.inv[loot]||0)+amt;
    G.log(`📦 A chest! +${amt} ${G.ITEMS[loot].name}.`); G.notify("good","Chest found",`+${amt} ${G.ITEMS[loot].name}`); G.Sound.play("pickup");
  } else G.log("🚶 Silence. You find nothing this time.");
  G.render();
};
G.leaveDungeon = function () { G.state.dungeon.active = false; G.state.dungeon.depth = 0; G.log("🚪 You climb back into daylight."); G.render(); };

/* Travel straight to a region and open the hunt for a target enemy — used by
   the story panel so a kill objective tells you exactly where to go. */
G.goHunt = function (region, enemyId) {
  const p = G.state;
  if (!p.map.unlocked.includes(region)) {
    G.notify("warning", "Not yet reachable", G.regionName ? G.regionName(region) + " is not unlocked." : "");
    return;
  }
  const list = (G.LOCAL_MAPS[region] || []);
  const poi = list.find(o => (o.spawn || []).indexOf(enemyId) >= 0) || list.find(o => (o.spawn || []).length);
  if (!poi) { G.notify("warning", "Nothing to hunt there", ""); return; }
  p.map.current = region;
  G.localAct(poi.id);
};

/* ---------- local map dispatch ---------- */
G.localAct = function (poiId) {
  const p = G.state;
  const poi = (LOCAL_MAPS[p.map.current]||[]).find(x => x.id === poiId);
  if (!poi) return;
  switch (poi.act) {
    case "tab": G.switchTab(poi.tab); break;
    case "inn": G.restInn(); break;
    case "pray": G.pray(); break;
    case "world": G.switchTab("atlas"); G.setMapMode("world"); break;
    case "gather": G.gather(poi.res, poi.cost); break;
    case "prospect": G.prospect(); break;
    case "fish": G.doFish(); break;
    case "forage": G.doForage(); break;
    case "farm": G.doFarm(); break;
    case "rumour": G.doRumour(); break;
    case "gamble": G.doGamble(20); break;
    case "cook": G.doCook(); break;
    case "bounty": G.bountyBoard(); break;
    case "arena": G.startArena(); break;
    case "endless": G.startEndless(); break;
    case "retreat": G.endlessRetreat(); break;
    case "dungeon": G.exploreDungeon(); break;
    case "hunt": G.startCombat(poi.spawn, { context:"hunt", cost:15 }); break;
  }
};

/* ---------- market ---------- */
G.priceBuy = function (item) { const rep = G.state.reputation.town; const trade = G.state.settlement.buildings.market||0; return Math.max(1, Math.ceil((G.state.market[item]||10) * 1.6 * (rep>50?0.9:1) * (1 - trade*0.04))); };
G.sellItem = function (item) { const p = G.state; if ((p.inv[item]||0) < 1) return; const price = Math.round((p.market[item]||10)*G.goldMult()); p.inv[item]--; p.gold += price; p.stats.goldEarned += price; G.log(`🪙 Sold 1 ${G.itemName(item)} for ${price}g.`); G.Sound.play("coin"); G.render(); };
G.buyItem = function (item) { const p = G.state, price = G.priceBuy(item); if (p.gold < price) { G.notify("warning","Not enough gold",""); G.Sound.play("error"); return; } p.gold -= price; p.stats.goldSpent += price; p.inv[item] = (p.inv[item]||0)+1; G.log(`🛒 Bought 1 ${G.itemName(item)}.`); G.Sound.play("coin"); G.render(); };
G.buyConsumable = function (item, price) { const p = G.state; if (p.gold < price) { G.notify("warning","Not enough gold",""); return; } p.gold -= price; p.stats.goldSpent += price; p.inv[item] = (p.inv[item]||0)+1; G.Sound.play("coin"); G.render(); };
G.blackBuy = function () { const p = G.state; if (p.gold < 60) { G.notify("warning","Need 60 gold",""); return; } p.gold -= 60; p.inv.relic = (p.inv.relic||0)+1; G.log("🏺 Bought a relic from the fence."); G.Sound.play("coin"); G.render(); };
G.blackSell = function () { const p = G.state; if ((p.inv.relic||0) < 1) { G.notify("warning","No relics to sell",""); return; } p.inv.relic--; const price = 110 + G.rndInt(-20,30); p.gold += price; p.stats.goldEarned += price; G.log(`🏺 Fenced a relic for ${price}g.`); G.Sound.play("coin"); G.render(); };

/* ---------- crafting ---------- */
G.recipes = function () {
  const list = [];
  for (const k in G.CONSUMABLE_RECIPES) list.push(Object.assign({ key:k, kind:"item" }, G.CONSUMABLE_RECIPES[k]));
  for (const k in G.GEAR) if (G.GEAR[k].cost) list.push({ key:k, kind:"gear", name:G.GEAR[k].name, emoji:G.GEAR[k].emoji, cost:G.GEAR[k].cost, tier:G.GEAR[k].tier, slot:G.GEAR[k].slot });
  return list;
};
/* One recipe's cost line, exactly as the Forge renders it. It lives here beside
   `recipes()` rather than in the view so a bad ingredient key is a DATA problem
   the content validator and the Node suites can reach: `viewForge` used to build
   this line with `G.ITEMS[k].emoji`, so one unknown key threw a TypeError and the
   whole Forge tab rendered nothing, with the console as the only clue. */
G.recipeCostLine = function (r) {
  const sprite = (typeof G.sprite === "function") ? G.sprite : ((k, e) => e);
  return Object.keys((r && r.cost) || {}).map(k => {
    const item = G.ITEMS[k];
    return `${r.cost[k]} ${sprite("item." + k, (item && item.emoji) || "❓")}`;
  }).join(" · ");
};
G.canCraft = function (key) { const p = G.state, r = G.recipes().find(x => x.key === key); if (!r) return false; for (const k in r.cost) if ((p.inv[k]||0) < r.cost[k]) return false; return true; };
G.craftRarity = function () { const p = G.state; const bonus = Math.min(11, p.skills.craft*0.3 + (p.settlement.buildings.workshop||0)*1.5); const roll = Math.random()*100 - bonus; if (roll < 0.4) return "mythic"; if (roll < 1.4) return "legendary"; if (roll < 7) return "epic"; if (roll < 26) return "rare"; return "common"; };
G.craftItem = function (key) {
  const p = G.state, r = G.recipes().find(x => x.key === key);
  if (!r) return;
  if (!G.canCraft(key)) { G.notify("warning","Missing materials",""); G.Sound.play("error"); return; }
  const preserve = Math.random() < (p.skills.craft*0.04);
  if (!preserve) for (const k in r.cost) p.inv[k] -= r.cost[k];
  p.stats.itemsCrafted++;
  if (r.kind === "item") { p.inv[key] = (p.inv[key]||0)+1; G.log(`🛠️ Crafted ${r.name}${preserve?" (materials preserved!)":""}.`); G.notify("good","Crafted",r.name); }
  else {
    const rarity = G.craftRarity(), n = G.RARITIES[rarity].affixes, affixes = [], pool = Object.keys(G.AFFIXES);
    for (let i=0;i<n;i++) { const a = G.pick(pool); if (affixes.indexOf(a)<0) affixes.push(a); }
    p.gearBag.push({ key, plus:0, rarity, affix:affixes });
    if (rarity === "legendary") p.stats.legendaries++; if (rarity === "mythic") p.stats.mythics++;
    G.log(`🛠️ Forged a ${G.RARITIES[rarity].name} ${r.name}${preserve?" (materials preserved!)":""}.`);
    G.notify("good", `Forged: ${G.RARITIES[rarity].name}`, r.name);
  }
  G.Sound.play("craft"); G.progressQuest("craft","any",1); G.checkAchievements(); G.render();
};
G.equipGear = function (i) { const p = G.state, item = p.gearBag[i]; if (!item) return; const slot = G.GEAR[item.key].slot; const old = p.gear[slot]; p.gear[slot] = item; p.gearBag.splice(i,1); if (old && old.key) p.gearBag.push(old); G.log(`🎽 Equipped ${G.GEAR[item.key].name}.`); G.Sound.play("ui"); G.notify("info","Equipped",G.GEAR[item.key].name); G.render(); };
G.salvageGear = function (i) { const p = G.state, item = p.gearBag[i]; if (!item) return; const gold = 8 + G.GEAR[item.key].tier*12 + (item.plus||0)*10 + (G.RARITIES[item.rarity].affixes*5); p.gearBag.splice(i,1); p.gold += gold; p.stats.goldEarned += gold; G.log(`♻️ Salvaged gear for ${gold}g.`); G.Sound.play("coin"); G.render(); };
G.dropItem = function (k) { const p = G.state; if ((p.inv[k]||0) < 1) return; p.inv[k]--; G.log(`🗑️ Dropped 1 ${G.itemName(k)}.`); G.render(); };
G.upgradeCost = function (slot) { const it = G.state.gear[slot]; if (!it || !it.key) return null; return { iron:2+(it.plus+1)*2, gold:20+(it.plus+1)*25, max:it.plus>=5 }; };
G.upgradeGear = function (slot) {
  const p = G.state, it = p.gear[slot], c = G.upgradeCost(slot);
  if (!c) return; if (c.max) { G.notify("warning","Already at +5",""); return; }
  if ((p.inv.iron||0) < c.iron || p.gold < c.gold) { G.notify("warning","Missing iron or gold",`Need ${c.iron}⛏️ and ${c.gold}g`); G.Sound.play("error"); return; }
  p.inv.iron -= c.iron; p.gold -= c.gold; it.plus++;
  G.log(`🔨 Upgraded ${G.GEAR[it.key].name} to +${it.plus}.`); G.notify("good","Upgraded",`${G.GEAR[it.key].name} +${it.plus}`); G.Sound.play("craft"); G.render();
};

/* ---------- settlement ---------- */
const SETTLEMENT_NAMES = ["Camp","Hamlet","Village","Town","City"];
G.settlementName = function () { return SETTLEMENT_NAMES[G.state.settlement.level] || "City"; };
G.settleCost = function () { const l = G.state.settlement.level; return [25,60,120,220][l] !== undefined ? [25,60,120,220][l] : null; };
G.upgradeSettlement = function () {
  const p = G.state, need = G.settleCost();
  if (need === null) { G.notify("warning","Fully grown",""); return; }
  if ((p.inv.wood||0) < need) { G.notify("warning",`Need ${need} wood`,""); G.Sound.play("error"); return; }
  p.inv.wood -= need; p.settlement.level++; p.settlement.pop += 12;
  G.log(`🏰 Your settlement grew into a ${G.settlementName()}!`);
  G.notify("good", `Settlement: ${G.settlementName()}`, "Population and income increased.");
  G.Sound.play("victory"); G.checkAchievements(); G.render();
};
G.buildStructure = function (key) {
  const p = G.state, b = G.BUILDINGS[key], cur = p.settlement.buildings[key]||0;
  if (cur >= b.max) { G.notify("warning","Fully upgraded",""); return; }
  for (const k in b.cost) if ((p.inv[k]||0) < b.cost[k]) { G.notify("warning","Missing materials",""); G.Sound.play("error"); return; }
  for (const k in b.cost) p.inv[k] -= b.cost[k];
  p.settlement.buildings[key] = cur+1;
  G.log(`🏗️ Built ${b.name} (level ${cur+1}).`); G.notify("good", `Built ${b.name}`, `Level ${cur+1}`); G.Sound.play("craft");
  G.progressQuest("build", key, 1); G.checkAchievements(); G.render();
};
G.assignWorker = function (key, delta) {
  const p = G.state, s = p.settlement;
  if (s.workers[key] === undefined) s.workers[key] = 0;
  const assigned = Object.values(s.workers).reduce((a,v)=>a+v,0);
  const cap = (s.buildings[key]||0)*2;
  if (delta > 0) { if (assigned >= s.pop) { G.notify("warning","No free settlers",""); return; } if (s.workers[key] >= cap) { G.notify("warning","No room",""); return; } s.workers[key]++; }
  else { if (!s.workers[key]) return; s.workers[key]--; }
  G.render();
};

/* ---------- underworld ---------- */
G.crimeChance = function () { const p = G.state; let c = 0.5 + p.skills.stealth*0.02 + p.attrs.finesse*0.01 - p.underworld.heat*0.003 + G.flatBonus("crime"); return G.clamp(c, 0.05, 0.95); };
G.crimeResult = function (success, reward, heat, failHeat, label) {
  const p = G.state;
  if (success) { p.gold += reward; p.stats.goldEarned += reward; p.stats.crimes++; G.log(`🎭 ${label}: success! +${reward}g.`); G.notify("good", label+" succeeded", `+${reward}g`); G.Sound.play("coin"); p.underworld.heat = G.clamp(p.underworld.heat+heat,0,100); }
  else { p.underworld.heat = G.clamp(p.underworld.heat+failHeat,0,100); G.log(`🚨 ${label}: you were spotted!`); G.notify("warning", label+" failed", "Heat rises"); G.Sound.play("error"); }
  G.progressQuest("crimes","any", success?1:0); G.checkAchievements(); G.render();
};
G.pickpocket = function () { const p = G.state; if (p.nerve < 3) { G.notify("warning","Need 3 nerve",""); return; } p.nerve -= 3; G.crimeResult(Math.random() < G.crimeChance(), G.rndInt(15,55), 3, 10, "Pickpocket"); };
G.lockpickChest = function () { const p = G.state; if (p.nerve < 2) { G.notify("warning","Need 2 nerve",""); return; } if ((p.inv.lockpick||0) < 1) { G.notify("warning","Need a lockpick",""); return; } p.nerve -= 2; const ok = Math.random() < G.crimeChance(); if (!ok && Math.random() < 0.5) p.inv.lockpick--; G.crimeResult(ok, G.rndInt(30,90), 4, 8, "Lockpick"); };
G.heist = function () { const p = G.state; if (p.nerve < 8) { G.notify("warning","Need 8 nerve",""); return; } p.nerve -= 8; const ok = Math.random() < G.crimeChance()*0.85; if (ok) { p.underworld.guildRep += 5; p.underworld.jobsDone++; p.stats.heists++; } G.crimeResult(ok, G.rndInt(150,400), 12, 30, "Heist"); G.progressQuest("heists","any", ok?1:0); };
G.guildJob = function () { const p = G.state; if (p.underworld.guildRep < 10) { G.notify("warning","Guild doesn't trust you yet","Need 10 renown"); return; } if (p.nerve < 4) { G.notify("warning","Need 4 nerve",""); return; } p.nerve -= 4; p.underworld.guildRep += 2; p.underworld.jobsDone++; const reward = G.rndInt(40,90); p.gold += reward; p.stats.goldEarned += reward; p.stats.crimes++; G.log(`🕵️ Guild job complete. +${reward}g.`); G.notify("good","Guild job done",`+${reward}g`); G.Sound.play("coin"); G.render(); };
G.layLow = function () { const p = G.state; if (p.gold < 50) { G.notify("warning","Need 50 gold",""); return; } p.gold -= 50; p.underworld.heat = G.clamp(p.underworld.heat-40,0,100); G.log("🍺 You lay low (-40 heat)."); G.notify("info","Laid low","Heat reduced"); G.render(); };
G.guardShakedown = function () { const p = G.state; const fine = Math.min(p.gold, 40 + p.underworld.heat); p.gold -= fine; p.underworld.heat = G.clamp(p.underworld.heat-30,0,100); G.log(`🚨 The watch shakes you down for ${fine}g.`); G.notify("warning","Shaken down",`Lost ${fine}g`); G.Sound.play("error"); };

/* ---------- activities ---------- */
G.doFish = function () {
  const p = G.state;
  if (p.energy < 8) { G.notify("warning","Not enough energy","Need 8⚡"); return; }
  p.energy -= 8;
  const n = G.rndInt(1,2) + (p.skills.craft > 5 ? 1 : 0);
  p.inv.fish = (p.inv.fish||0)+n; p.stats.fish += n;
  G.log(`🎣 You catch ${n} fish.`); G.notify("good","Fishing",`+${n} fish`); G.Sound.play("pickup");
  G.progressQuest("fish","any",n); G.checkAchievements(); G.render();
};
G.doForage = function () {
  const p = G.state;
  if (p.energy < 6) { G.notify("warning","Not enough energy","Need 6⚡"); return; }
  p.energy -= 6;
  const n = G.rndInt(1,3);
  p.inv.herb = (p.inv.herb||0)+n;
  G.log(`🌿 You gather ${n} herbs.`); G.notify("good","Foraging",`+${n} herbs`); G.Sound.play("pickup");
  G.progressQuest("gather","herb",n); G.render();
};
G.doFarm = function () {
  const p = G.state;
  if (!p.settlement.buildings.farm) { G.notify("warning","No Farm built","Build one in the Home tab"); return; }
  if (p.energy < 5) { G.notify("warning","Not enough energy","Need 5⚡"); return; }
  p.energy -= 5;
  const n = p.settlement.buildings.farm*2 + G.rndInt(1,3);
  p.inv.food = (p.inv.food||0)+n; p.stats.harvests++;
  const gold = p.settlement.buildings.farm*4; p.gold += gold; p.stats.goldEarned += gold;
  G.log(`🌾 Harvest: ${n} food and ${gold}g.`); G.notify("good","Harvest",`+${n} food, +${gold}g`); G.Sound.play("pickup");
  G.progressQuest("farm","any",1); G.checkAchievements(); G.render();
};
G.doRumour = function () {
  const p = G.state;
  if (p.gold < 15) { G.notify("warning","Need 15 gold",""); return; }
  p.gold -= 15;
  const r = G.pick(G.TAVERN_RUMOURS);
  G.log(`🍺 Rumour: ${r}`); G.notify("info","Tavern rumour",r); G.render();
};
G.doGamble = function (amount) {
  const p = G.state;
  if (p.gold < amount) { G.notify("warning","Not enough gold",""); return; }
  p.gold -= amount;
  const roll = Math.random();
  if (roll < 0.45) { const win = Math.round(amount*1.8); p.gold += win; p.stats.gambledWon += win; G.notify("good","You win!",`+${win}g`); G.log(`🎲 Won ${win}g.`); G.Sound.play("coin"); }
  else { G.notify("bad","You lose",`−${amount}g`); G.log(`🎲 Lost ${amount}g.`); G.Sound.play("error"); }
  G.checkAchievements(); G.render();
};
G.startArena = function () {
  const p = G.state;
  if (p.energy < 15) { G.notify("warning","Need 15 energy",""); return; }
  p.energy -= 15;
  const wave = Math.min(p.activities.arena.wave, G.ARENA_WAVES.length-1);
  const w = G.ARENA_WAVES[wave];
  G.startCombat(w.enemies, { cost:0, context:"arena" });
  G._arenaWave = wave;
};
G.arenaWin = function () {
  const p = G.state;
  const wave = G._arenaWave || 0, w = G.ARENA_WAVES[wave];
  p.gold += w.reward.gold; G.gainXP(w.reward.xp); p.stats.arenaWins++;
  p.activities.arena.wave = Math.min(wave+1, G.ARENA_WAVES.length-1);
  G.notify("good", "Arena wave cleared!", `${w.name} · +${w.reward.gold}g`);
  G.progressQuest("arena","any",1); G.checkAchievements();
};
G.doCook = function () {
  const p = G.state;
  if ((p.inv.food||0) < 2 || (p.inv.fish||0) < 1) { G.notify("warning","Need 2 food and 1 fish",""); return; }
  p.inv.food -= 2; p.inv.fish -= 1; p.inv.meal = (p.inv.meal||0)+1; p.stats.meals++;
  G.log("🍳 You cook a hearty meal."); G.notify("good","Cooked","+1 Hearty Meal"); G.Sound.play("craft");
  G.checkAchievements(); G.render();
};
G.bountyBoard = function () { G.generateBounty(); };

/* ---------- travel events ---------- */
G.pendingEvent = null;
G.triggerEvent = function () {
  const total = G.WORLD_EVENTS.reduce((a,e)=>a+e.weight,0);
  let r = Math.random()*total, ev = G.WORLD_EVENTS[0];
  for (const e of G.WORLD_EVENTS) { r -= e.weight; if (r <= 0) { ev = e; break; } }
  G.pendingEvent = ev;
  const ttl = document.getElementById("event-title"), txt = document.getElementById("event-text"), ch = document.getElementById("event-choices");
  if (ttl) ttl.textContent = ev.emoji + " " + ev.title;
  if (txt) txt.textContent = ev.text;
  if (ch) ch.innerHTML = ev.choices.map(c => `<button class="btn btn-block" onclick="Game.eventChoice('${c.action}')">${c.label}</button>`).join("");
  G.openModal("event-overlay");
  G.Sound.play("ui");
};
G.closeEvent = function () { G.closeModal("event-overlay"); G.pendingEvent = null; };
G.eventChoice = function (action) { G.closeEvent(); if (typeof G[action] === "function") G[action](); G.render(); };
G.eventFight = function () { const loc = G.state.map.current; const pool = (G.LOCATIONS[loc]&&G.LOCATIONS[loc].spawns)||["beast"]; G.startCombat([G.pick(pool)], { cost:0, context:"event" }); };
G.eventFlee = function () { if (Math.random() < G.fleeChance()) G.log("🏃 You slip away unscathed."); else { const dmg = Math.round(G.maxHp()*0.12); G.state.hp = Math.max(1, G.state.hp-dmg); G.log(`🩸 You escape, but take ${dmg} damage.`); G.flash(); G.Sound.play("hit"); } };
G.eventBuyPotion = function () { const p = G.state; if (p.gold < 20) { G.notify("warning","Not enough gold",""); return; } p.gold -= 20; p.inv.potion++; G.notify("good","Bought a potion","−20g"); G.Sound.play("coin"); };
G.eventBuyIron = function () { const p = G.state; if (p.gold < 10) { G.notify("warning","Not enough gold",""); return; } p.gold -= 10; p.inv.iron = (p.inv.iron||0)+2; G.notify("good","Bought 2 iron","−10g"); G.Sound.play("coin"); };
G.eventBlessMight = function () { G.state.attrs.might++; G.notify("good","Shrine blessing","+1 Might"); G.Sound.play("heal"); };
G.eventBlessHp = function () { G.state.hp = G.maxHp(); G.notify("good","Shrine blessing","Fully healed"); G.Sound.play("heal"); };
G.eventCache = function () { const p = G.state; const gold = G.rndInt(15,60); p.gold += gold; p.stats.goldEarned += gold; const it = G.pick(["iron","leather","wood","herb"]); p.inv[it] = (p.inv[it]||0)+G.rndInt(1,3); G.notify("good","Hidden cache",`+${gold}g and some ${it}`); G.Sound.play("coin"); };
G.eventHelp = function () { const p = G.state; p.gold = Math.max(0, p.gold-10); G.addRep("town",8); G.notify("info","You helped a traveller","Town reputation +8"); };
G.eventCatch = function () { const p = G.state; if (Math.random() < 0.5 + p.skills.stealth*0.03) { const g = G.rndInt(10,40); p.gold += g; G.notify("good","Caught the cutpurse",`+${g}g`); G.Sound.play("coin"); } else { const g = Math.min(p.gold, G.rndInt(10,40)); p.gold -= g; G.notify("bad","Cutpurse escaped",`−${g}g`); G.Sound.play("error"); } };
G.eventCaravan = function () { const p = G.state; if (p.gold < 40) { G.notify("warning","Need 40 gold",""); return; } p.gold -= 40; if (Math.random() < 0.55) { const win = 100; p.gold += win; G.notify("good","Caravan paid off",`+${win}g`); G.Sound.play("coin"); } else { G.notify("bad","Caravan lost", "−40g"); G.Sound.play("error"); } };
G.eventDuel = function () { const loc = G.state.map.current; G.startCombat(["assassin"], { cost:0, context:"event" }); };
G.eventNone = function () { G.log("You move on."); };

/* ---------- spontaneous events ---------- */
G.maybeSpontaneousEvent = function () {
  const p = G.state;
  if (p.combat.active) return;
  if (Math.random() > 0.012) return;
  const total = G.SPONTANEOUS_EVENTS.reduce((a,e)=>a+e.weight,0);
  let r = Math.random()*total, ev = G.SPONTANEOUS_EVENTS[0];
  for (const e of G.SPONTANEOUS_EVENTS) { r -= e.weight; if (r <= 0) { ev = e; break; } }
  p.stats.events++;
  G.notify("event", ev.emoji + " " + ev.title, ev.text);
  if (typeof G[ev.action] === "function") G[ev.action]();
};
G.eventTreasure = function () { const p = G.state; const gold = G.rndInt(60,220); p.gold += gold; p.stats.goldEarned += gold; const it = G.pick(["ruby","ore","relic"]); p.inv[it] = (p.inv[it]||0)+1; G.log(`💰 Buried treasure! +${gold}g and a ${it}.`); G.notify("good","Treasure!",`+${gold}g, +1 ${G.ITEMS[it].name}`); G.Sound.play("coin"); };
G.eventMeteor = function () { const p = G.state; const n = G.rndInt(2,5); p.inv.ore = (p.inv.ore||0)+n; G.log(`☄️ Meteor shards: +${n} deep ore.`); G.notify("good","Meteor shower",`+${n} deep ore`); G.Sound.play("pickup"); };
G.eventBoon = function () { G.state.energy = G.maxEnergy(); G.state.nerve = G.maxNerve(); G.notify("good","Clarity","Energy and nerve restored"); G.Sound.play("heal"); };
G.eventPlague = function () { const p = G.state; const dmg = Math.round(G.maxHp()*0.08); p.hp = Math.max(1, p.hp-dmg); G.notify("bad","Swarm of flies",`−${dmg} HP`); G.flash(); G.Sound.play("hit"); };
G.eventRumor = function () { const r = G.pick(G.TAVERN_RUMOURS); G.notify("info","You overhear something",r); };
G.eventGift = function () { const p = G.state; const gold = G.rndInt(30,90); p.gold += gold; p.inv.potion = (p.inv.potion||0)+1; G.notify("good","A gift",`+${gold}g and a potion`); G.Sound.play("coin"); };
G.eventStorm = function () { const p = G.state; p.energy = Math.max(0, p.energy-15); G.notify("info","Violent storm","You lose 15 energy sheltering"); };
G.eventRaid = function () { if (G.settlementRaid) G.settlementRaid(); };
G.eventAmbush = function () { G.notify("bad","Assassin ambush!",""); G.startCombat(["assassin"], { cost:0, context:"event" }); };
G.eventWindfall = function () { const p = G.state; const gold = G.rndInt(25,80); p.gold += gold; p.stats.goldEarned += gold; G.notify("good","Windfall",`+${gold}g`); G.Sound.play("coin"); };

/* ---------- quality of life ---------- */
G.returnToTown = function () {
  const p = G.state;
  if (p.map.current === "town") { G.notify("info", "You are already in Town", ""); return; }
  p.dungeon.active = false; p.dungeon.depth = 0;
  p.endless.active = false; p.endless.floor = 0; p.endless.mods = [];
  p.map.current = "town";
  if (p.map.visited.indexOf("town") < 0) p.map.visited.push("town");
  G.log("🏘️ You return to Town."); G.notify("info", "Returned to Town", ""); G.render();
};
G.sellAllMaterials = function () {
  const p = G.state; let total = 0, count = 0;
  Object.keys(G.ITEMS).forEach(k => {
    if (!G.ITEMS[k].material) return;
    const n = p.inv[k] || 0; if (!n) return;
    const price = Math.round((p.market[k] || 10) * G.goldMult());
    total += price * n; count += n; p.inv[k] = 0;
  });
  if (!count) { G.notify("warning", "Nothing to sell", ""); return; }
  p.gold += total; p.stats.goldEarned += total;
  G.notify("good", "Sold all materials", `+${total}g for ${count} items`); G.Sound.play("coin"); G.render();
};
G.gearScore = function (it) {
  const g = G.GEAR[it.key]; if (!g) return 0;
  const r = G.RARITIES[it.rarity] ? G.RARITIES[it.rarity].mult : 1;
  return (((g.atk||0) + (g.def||0)*0.9 + (g.spell||0)*0.8 + (g.hp||0)*0.25 + (g.crit?g.crit*120:0) + (g.flee?g.flee*80:0)) * r) + (it.plus||0)*3 + (G.socketsFor(it)*2);
};
G.autoEquipBest = function () {
  const p = G.state; let equipped = 0, guard = 0;
  let changed = true;
  while (changed && guard++ < 40) {
    changed = false;
    for (let i = 0; i < p.gearBag.length; i++) {
      const it = p.gearBag[i], slot = G.GEAR[it.key].slot, cur = p.gear[slot];
      if (!cur || !cur.key || G.gearScore(it) > G.gearScore(cur)) {
        p.gear[slot] = it; p.gearBag.splice(i, 1);
        if (cur && cur.key) p.gearBag.push(cur);
        equipped++; changed = true; break;
      }
    }
  }
  if (equipped) { G.notify("good", `Auto-equipped ${equipped} item${equipped>1?"s":""}`, ""); G.Sound.play("ui"); }
  else G.notify("info", "Already wearing your best gear", "");
  G.render();
};
G.craftMany = function (key, times) {
  const r = G.recipes().find(x => x.key === key);
  let made = 0;
  for (let i = 0; i < times; i++) { if (!G.canCraft(key)) break; G.craftItem(key); made++; }
  if (!made) G.notify("warning", "Could not craft", "Check your materials.");
  else G.notify("good", `Crafted ${made}× ${r ? r.name : ""}`, "");
};

/* ---------- contextual hints ---------- */
G.getHints = function () {
  const p = G.state, h = [];
  if (p.hp < G.maxHp()*0.35) h.push("You're badly wounded — rest at the Inn (25g) or pray at the Temple (40g).");
  if ((p.inv.potion||0) < 1 && p.level < 12) h.push("No potions left — buy them at the Market or brew them at the Forge (1 wood + 1 leather).");
  if (p.energy < 25) h.push("Energy is low — it regenerates as you play, or drink an Energy Draught.");
  if (p.ap > 0) h.push(`You have ${p.ap} unspent attribute point${p.ap>1?"s":""} — spend them in the Hero tab.`);
  if (p.sp > 0) h.push(`You have ${p.sp} unspent skill point${p.sp>1?"s":""} — spend them in the Skills tab.`);
  if (p.settlement.level >= 1 && !p.settlement.buildings.farm) h.push("Build a Farm in the Home tab for steady food and income.");
  if (p.story.chapter === 3) h.push("Descend the The Caves to depth 3. Leave and re-enter to bank progress if you're low on energy.");
  if (p.story.chapter === 4) h.push("The Cult Leader resists Dark — bring Fire damage, and Defend when it telegraphs Necrotic Wave.");
  if (p.story.chapter === 5) h.push("The Iron Guardian resists Physical and is weak to Ice — use Frost Nova or ice weapons.");
  if (p.level < 6) h.push("Fight the Arena waves in Town or hunt in the The Wilds to level up quickly.");
  const cm = G.activeQuests().find(q => q.type === "class");
  if (cm) h.push(`Class mission ready: ${cm.name} — ${cm.desc}`);
  const failed = G.activeQuests().find(q => q.attempts > 0);
  if (failed) h.push(`You've failed "${failed.name}" — open its preparation hint in the quest log.`);
  if (!h.length) h.push(G.pick(G.TAVERN_RUMOURS));
  return h.slice(0, 3);
};

/* ---------- ascension ---------- */
G.canAscend = function () { const p = G.state; return p.story.completed || p.level >= 25; };
G.ascend = function () {
  const p = G.state;
  if (!G.canAscend()) { G.notify("warning","Finish the story or reach level 25",""); return; }
  if (!confirm("Ascend? Your run resets — but you keep achievements and gain permanent power.")) return;
  const keep = { achievements:p.achievements, ascensions:p.ascensions+1, cls:p.cls, race:p.race, gender:p.gender, name:p.name, stats:p.stats, difficulty:p.difficulty, slot:p.slot, created:p.created };
  const n = keep.ascensions;
  const fresh = G.defaultState(p.slot, p.difficulty);
  Object.assign(fresh, keep);
  fresh.attrs.might += n; fresh.attrs.finesse += n; fresh.attrs.sorcery += n; fresh.attrs.vitality += n;
  fresh.ap = n*5; fresh.sp = n*2; fresh.maxHp += n*25; fresh.maxEnergy += n*8; fresh.gold = 100;
  G.state = fresh;
  G.seed();
  G.log(`♾️ Ascension ${n}! The world resets, but you carry ${n} ranks of power.`);
  G.notify("good", `Ascended to rank ${n}!`, "Permanent bonuses gained");
  G.Sound.play("levelup"); G.checkAchievements(); G.switchTab("story");
};
})();
