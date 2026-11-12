/* ============================================================
   Aethelgard — CORE: state, saves, tick, stats, audio, fx, notify
   Created by Dr. Sohil Momin
   ============================================================ */
"use strict";
(function () {
const G = window.Game;

/* ---------- settings ---------- */
const SETTINGS_KEY = "aethelgard_v7_settings";
G.settings = {
  lang:"en", mode:"chronicles", sound:true, volume:0.7, difficulty:"normal",
  fontScale:1, reduceMotion:false, theme:"dark", compact:false, colorblind:false,
  tooltips:true, notify:true, damageNumbers:true, screenShake:true, autosave:true,
  music:true, musicVolume:0.5, font:"default", palette:"default", autoBattle:false, graphics:null,
};
G.loadSettings = function () {
  try { const s = JSON.parse(localStorage.getItem(SETTINGS_KEY)); if (s) G.settings = Object.assign(G.settings, s); } catch (e) {}
};
G.saveSettings = function () { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(G.settings)); } catch (e) {} };
G.applySettings = function () {
  const s = G.settings;
  try { document.documentElement.lang = (G.LANG_TAGS && G.LANG_TAGS[s.lang]) || s.lang || "en"; } catch (e) {}
  document.documentElement.style.fontSize = (15 * s.fontScale) + "px";
  const body = document.body;
  body.classList.toggle("reduce-motion", !!s.reduceMotion);
  body.classList.toggle("no-sound", !s.sound);
  body.classList.toggle("compact", !!s.compact);
  body.classList.toggle("colorblind", !!s.colorblind);
  body.className = body.className.replace(/theme-\S+/g, "");
  if (G.THEMES[s.theme] && G.THEMES[s.theme].cls) body.classList.add(G.THEMES[s.theme].cls);
  body.classList.toggle("font-dyslexic", s.font === "dyslexic");
  body.classList.toggle("palette-alt", s.palette === "alt");
  if (G.Sound && G.Sound.master) G.Sound.master.gain.value = 0.22 * s.volume;
  if (G.Music && G.Music.refreshVolume) G.Music.refreshVolume();
};
/* translate a data-table name (class, race …) falling back to the data value */
/* safe item lookups — a mod (or an old save) may carry a key we do not know */
G.itemName = function (k) { const i = G.ITEMS[k]; return i ? i.name : String(k); };
G.itemEmoji = function (k) { const i = G.ITEMS[k]; return i ? i.emoji : "\uD83D\uDCE6"; };

G.tName = function (id, fallback) {
  const k = "name." + id, v = G.t(k);
  return (v === k) ? (fallback || id) : v;
};
G.clsName = function (id) { const d = G.CLASSES[id]; return d ? G.tName(id, d.name) : id; };
G.raceName = function (id) { const d = G.RACES[id]; return d ? G.tName(id, d.name) : id; };

G.t = function (key) {
  const L = G.I18N;
  return (L[G.settings.lang] && L[G.settings.lang][key]) || L.en[key] || key;
};

/* ---------- audio ---------- */
const Sound = G.Sound = {
  ctx:null, master:null,
  init(){
    if(this.ctx) { this.resume(); return; }          // already built — just make sure it is running
    try{
      const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
      this.ctx=new AC();
      this.master=this.ctx.createGain();
      // a bad stored volume would otherwise leave the gain at 1 (the AudioParam
      // rejects NaN), which is ten times too loud
      const v = Number(G.settings && G.settings.volume);
      this.master.gain.value = 0.22 * (isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.7);
      this.master.connect(this.ctx.destination);
    }catch(e){ this.ctx=null; }
  },
  setVolume(v){ if(!this.master) return; const n=Number(v); this.master.gain.value = 0.22 * (isFinite(n)?Math.max(0,Math.min(1,n)):0.7); },
  resume(){ if(this.ctx && this.ctx.state==="suspended") this.ctx.resume(); },
  _tone(freq,dur,type,vol,delay){ if(!this.ctx||!G.settings.sound) return; const t0=this.ctx.currentTime+(delay||0); const o=this.ctx.createOscillator(),g=this.ctx.createGain(); o.type=type||"sine"; o.frequency.setValueAtTime(freq,t0); g.gain.setValueAtTime(0.0001,t0); g.gain.exponentialRampToValueAtTime(vol||0.3,t0+0.01); g.gain.exponentialRampToValueAtTime(0.0001,t0+dur); o.connect(g); g.connect(this.master); o.start(t0); o.stop(t0+dur+0.02); },
  _noise(dur,vol,freq){ if(!this.ctx||!G.settings.sound) return; const t0=this.ctx.currentTime; const n=Math.floor(this.ctx.sampleRate*dur); const buf=this.ctx.createBuffer(1,n,this.ctx.sampleRate); const d=buf.getChannelData(0); for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n); const src=this.ctx.createBufferSource(); src.buffer=buf; const f=this.ctx.createBiquadFilter(); f.type="bandpass"; f.frequency.value=freq||1200; const g=this.ctx.createGain(); g.gain.value=vol||0.3; src.connect(f); f.connect(g); g.connect(this.master); src.start(t0); },
  play(name){
    if(!G.settings.sound) return;
    // the context can be suspended by the browser at any time; a silent
    // failure here is exactly what "the game has no sound" looks like
    if(!this.ctx) this.init();
    if(!this.ctx) return;
    if(this.ctx.state==="suspended"){ try{ this.ctx.resume(); }catch(e){} }
    switch(name){
    case "ui": this._tone(420,0.06,"triangle",0.18); break;
    case "sword": this._noise(0.12,0.28,2200); this._tone(180,0.09,"square",0.12); break;
    case "hit": this._tone(140,0.16,"sawtooth",0.22); this._noise(0.1,0.2,700); break;
    case "crit": this._tone(880,0.1,"square",0.25); this._tone(1320,0.14,"square",0.2,0.06); this._noise(0.14,0.25,2600); break;
    case "spell": this._tone(300,0.35,"sine",0.2); this._tone(600,0.35,"sine",0.12,0.02); this._tone(900,0.3,"sine",0.08,0.05); break;
    case "heal": this._tone(520,0.2,"sine",0.2); this._tone(780,0.3,"sine",0.15,0.08); break;
    case "coin": this._tone(1180,0.07,"square",0.18); this._tone(1560,0.1,"square",0.16,0.05); break;
    case "craft": this._noise(0.1,0.25,3000); this._tone(240,0.12,"square",0.15); break;
    case "levelup": [523,659,784,1047].forEach((f,i)=>this._tone(f,0.28,"triangle",0.22,i*0.09)); break;
    case "victory": [392,523,659,784].forEach((f,i)=>this._tone(f,0.3,"triangle",0.2,i*0.1)); break;
    case "death": [392,330,262,196].forEach((f,i)=>this._tone(f,0.4,"sawtooth",0.2,i*0.14)); break;
    case "error": this._tone(160,0.2,"square",0.2); break;
    case "pickup": this._tone(700,0.09,"triangle",0.18); this._tone(980,0.12,"triangle",0.15,0.06); break;
    case "boss": [110,146,110].forEach((f,i)=>this._tone(f,0.5,"sawtooth",0.22,i*0.2)); break;
    case "notify": this._tone(880,0.09,"triangle",0.16); this._tone(1180,0.12,"triangle",0.13,0.07); break;
  } }
};

/* ---------- fx ---------- */
G.floatText = function (text, cls, x, y) {
  if (G.settings.reduceMotion || !G.settings.damageNumbers) return;
  const layer = document.getElementById("fx-layer"); if (!layer) return;
  const el = document.createElement("div");
  el.className = "float-text " + (cls || "");
  el.textContent = text;
  el.style.left = (x != null ? x : 50 + (Math.random()*16-8)) + "%";
  el.style.top  = (y != null ? y : 42 + (Math.random()*10-5)) + "%";
  layer.appendChild(el);
  setTimeout(() => el.remove(), 950);
};
G.shake = function (el, strong) {
  if (G.settings.reduceMotion || !G.settings.screenShake) return;
  const target = el || document.getElementById("combat-box") || document.body;
  target.classList.remove("shake","shake-strong"); void target.offsetWidth;
  target.classList.add(strong ? "shake-strong" : "shake");
  setTimeout(() => target.classList.remove("shake","shake-strong"), 380);
};
G.flash = function (color) {
  if (G.settings.reduceMotion) return;
  const f = document.getElementById("flash"); if (!f) return;
  f.style.background = color || "rgba(209,70,58,.35)";
  f.classList.remove("on"); void f.offsetWidth; f.classList.add("on");
  setTimeout(() => f.classList.remove("on"), 320);
};

/* ---------- notifications ---------- */
G.notify = function (type, title, body) {
  if (!G.state) return;
  const n = { id:"n"+Date.now()+Math.random().toString(36).slice(2,6), type:type||"info", title, body:body||"", time:Date.now(), read:false };
  G.state.notifications.unshift(n);
  if (G.state.notifications.length > 60) G.state.notifications.pop();
  if (G.settings.notify) G.toast(`${title}${body ? " — " + body : ""}`, type === "warning" ? "bad" : type === "good" ? "good" : "");
  if (type !== "info") G.Sound.play("notify");
  G.updateBell();
  return n;
};
G.unreadCount = function () { return G.state ? G.state.notifications.filter(n => !n.read).length : 0; };
G.updateBell = function () {
  const b = document.getElementById("bell-count"); if (!b) return;
  const c = G.unreadCount();
  b.textContent = c > 0 ? (c > 9 ? "9+" : String(c)) : "";
  b.classList.toggle("hidden", c === 0);
};
G.markAllRead = function () { if (G.state) { G.state.notifications.forEach(n => n.read = true); G.updateBell(); } };
G.toast = function (msg, kind) {
  if (!G.settings.notify) return;
  const box = document.getElementById("toasts"); if (!box) return;
  while (box.children.length >= 3) box.removeChild(box.firstChild);
  const el = document.createElement("div");
  el.className = "toast" + (kind ? " " + kind : "");
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.remove(), 3400);
};

/* ---------- save slots ---------- */
/* ---------- storage ----------
   Saves live in localStorage. It is synchronous, so a save is durable the
   moment it is written — an earlier IndexedDB version could lose the last save
   if the page was closed or reloaded before the async write committed. A save
   is about 13 KB, so localStorage's ~5 MB holds a few hundred of them, which is
   far more than the three slots need.

   A memory cache keeps reads fast, and the API is kept small so callers do not
   care how it is stored. */
G.store = (function () {
  const mem = {};
  let primed = false;

  function primeSync() {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf("aethelgard_v") === 0 && k.indexOf("_slot") > 0) mem[k] = localStorage.getItem(k);
      }
    } catch (e) {}
    primed = true;
  }

  function put(key, value) {
    mem[key] = value;
    try { localStorage.setItem(key, value); return true; }
    catch (e) {
      if (G.notify) G.notify("bad", "Could not save", "Browser storage is full or blocked.");
      return false;
    }
  }

  function del(key) {
    delete mem[key];
    try { localStorage.removeItem(key); } catch (e) {}
  }

  return {
    init: () => { primeSync(); return Promise.resolve(true); },
    primeSync, put, del,
    get: k => (k in mem ? mem[k] : (primed ? null : (primeSync(), mem[k] != null ? mem[k] : null))),
    keys: () => Object.keys(mem),
    isReady: () => true,
    usingIDB: () => false,
  };
})();

const slotKey = (i, modeId) => {
  const m = modeId || (typeof G.activeModeId === "function" ? G.activeModeId() : "chronicles");
  return m === "chronicles" ? "aethelgard_v7_slot" + i : "aethelgard_v7_" + m + "_slot" + i;
};
G.listSlots = function (modeId) {
  const want = modeId || G.activeModeId();
  const out = [];
  for (let i = 1; i <= 3; i++) {
    let meta = null;
    try {
      const raw = G.store.get(slotKey(i));
      if (raw) {
        const s = JSON.parse(raw);
        const m = s.modeId || "chronicles";
        // a slot belongs to one game only — the other game does not see it
        if (m === want) meta = { level:s.level, cls:s.cls, race:s.race, name:s.name,
                                 modeId:m, play:s.stats?Math.floor((s.stats.timePlayed||0)/60):0, date:s.created };
      }
    } catch (e) {}
    out.push({ slot:i, meta });
  }
  return out;
};
G.save = function () {
  if (!G.state || !G.settings.autosave && G._manual !== true) { }
  if (!G.state) return;
  G.store.put(slotKey(G.state.slot || 1), JSON.stringify(G.state));
};
/* What a loadable save IS — one definition, used by the loader AND by import.

   The loader demanded a numeric `level` and an `attrs` object; import demanded
   only that `level` was not null. So `{"level":"seven"}` was imported, written
   over a slot and announced as a success, and then refused on the next boot by
   the loader — over the save the player had just given up. A validator the
   writer does not consult is not a validator.

   Returns an ARRAY of plain reasons (empty = loadable), so a refusal can tell
   the player what is actually wrong instead of "invalid". */
G.saveProblems = function (s) {
  const p = [];
  if (s === null || typeof s !== "object" || Array.isArray(s)) { p.push("it is not a save object"); return p; }
  if (typeof s.level !== "number" || !isFinite(s.level) || s.level < 1) p.push("its level is not a number");
  if (typeof s.attrs !== "object" || s.attrs === null || Array.isArray(s.attrs)) p.push("its attributes are missing");
  if (s.modeId !== undefined && typeof s.modeId !== "string") p.push("its game id is not a string");
  return p;
};
G.validSave = function (s) { return G.saveProblems(s).length === 0; };

/* A save belongs to one game (see SAVE-FORMAT.md: slot 1 in Chronicles and
   slot 1 in The Crown's Shadow are different characters). loadSlot() refuses
   the other game's save by design — so import must refuse it too, or it
   announces a success the next boot will not honour. */
G.saveModeConflict = function (s) {
  const id = (s && s.modeId) || "chronicles";
  if (id === G.activeModeId()) return null;
  const from = (G.MODES[id] && G.MODES[id].name) || id;
  const m = G.activeMode();
  const to = (m && m.name) || G.activeModeId();
  return "it is a " + from + " save, and " + to + " is the game you are playing";
};

/* A refusal has to be visible even on the title screen, where there is no live
   G.state yet — notify() returns early in exactly that case, which is how an
   import could fail with nothing on screen at all. */
G.importRefused = function (why) {
  const title = "Not a valid save";
  const body = "Nothing was imported — " + why + ".";
  if (G.state) G.notify("bad", title, body);
  else if (G.toast) G.toast(title + " — " + body, "bad");
  console.warn(title + ": " + body);
  return null;
};
G.loadSlot = function (i) {
  try {
    const raw = G.store.get(slotKey(i));
    if (!raw) return null;
    // a save belongs to one game — do not load the other game's character
    const want = G.activeModeId();
    const saved = JSON.parse(raw).modeId || "chronicles";
    if (saved !== want) return null;
    const s = JSON.parse(raw);
    if (!G.validSave(s)) { console.warn("Save slot " + i + " is corrupt or from an incompatible version; ignoring."); return null; }
    return s;
  } catch (e) { console.warn("Save slot " + i + " could not be read:", e); return null; }
};
G.deleteSlot = function (i) { G.store.del(slotKey(i)); };

/* ---------- default state ---------- */
G.defaultState = function (slot, difficulty) {
  const __modeId = (typeof G.activeModeId === "function" ? G.activeModeId() : "chronicles");
  return {
    version:G.GAME_VERSION, slot:slot||1, created:Date.now(), difficulty:difficulty||"normal",
    name:"Wanderer", race:"human", gender:"nb", cls:null,
    level:1, xp:0, gold:60,
    hp:100, maxHp:100, energy:60, maxEnergy:60, nerve:20, maxNerve:20,
    ap:0, sp:0,
    modeId: __modeId,
    attrs:{ might:5, finesse:5, sorcery:5, vitality:5 },
    skills:{ swords:1, magic:1, stealth:1, craft:1 },
    inv:{ wood:0, iron:0, leather:0, potion:2, ruby:0, food:0, fish:0, herb:0, ore:0, ether:0, antidote:0, lockpick:1, relic:0 },
    gems:{},
    gear:{ weapon:{key:"dagger",plus:0,rarity:"common",affix:[]}, offhand:{key:null,plus:0,rarity:"common",affix:[]}, armor:{key:"clothes",plus:0,rarity:"common",affix:[]}, helmet:{key:null,plus:0,rarity:"common",affix:[]}, boots:{key:null,plus:0,rarity:"common",affix:[]}, ring:{key:null,plus:0,rarity:"common",affix:[]}, amulet:{key:null,plus:0,rarity:"common",affix:[]} },
    gearBag:[],
    map:{ current:"wilds", unlocked:["town","wilds","shrine"], visited:["wilds"] },
    settlement:{ level:0, pop:0, treasury:0, buildings:{ farm:0, mine:0, tavern:0, barracks:0, workshop:0, market:0, shrine:0 }, workers:{ farm:0, mine:0, tavern:0 } },
    market:{ wood:10, iron:15, leather:12, ruby:55, food:8, fish:9, herb:11, ore:26 },
    underworld:{ heat:0, guildRep:0, jobsDone:0 },
    dungeon:{ active:false, depth:0 },
    combat:{ active:false },
    companions:[], activeCompanion:null, limit:0,
    endless:{ active:false, floor:0, mods:[], best:0 },
    caravans:[], defence:{ walls:0, guards:0 }, secrets:{}, daily:{ date:null, done:false },
    quests:[],
    completedQuests:[],
    failedQuests:{},
    story:{ chapter:1, choices:{}, pending:null, completed:false },
    mode:"story",
    reputation:{ town:0, coven:0, bandits:0 },
    achievements:{},
    notifications:[],
    flags:{},
    ascensions:0,
    time:{ ticks:0, day:1, phase:0 },
    activities:{ farm:{ plots:0 }, arena:{ wave:0 }, gamble:{ won:0 } },
    stats:{ kills:0, byEnemy:{}, bossKills:0, goldEarned:0, goldSpent:0, itemsCrafted:0, questsDone:0,
            bounties:0, deepestDepth:0, deaths:0, crimes:0, heists:0, legendaries:0, mythics:0,
            timePlayed:0, fish:0, harvests:0, arenaWins:0, meals:0, gambledWon:0, classMissions:0, events:0,
            eliteKills:0, reactions:0, endlessBest:0, defendsWon:0, caravansIncome:0, companionsRecruited:0, gemsSocketed:0, secretsFound:0, ultimateUses:0 },
    log:[],
  };
};

G.migrate = function (s) {
  const d = G.defaultState();
  const out = Object.assign({}, d, s);
  ["attrs","skills","inv","map","settlement","market","underworld","dungeon","story","reputation","flags","time","stats","activities","endless","defence"].forEach(k => out[k] = Object.assign({}, d[k], s[k]||{}));
  out.companions = s.companions || [];
  out.gems = s.gems || {};
  out.caravans = s.caravans || [];
  out.secrets = s.secrets || {};
  out.activeCompanion = s.activeCompanion || null;
  out.modeId = s.modeId || "chronicles";   // older saves predate game modes
  out.limit = s.limit || 0;
  out.daily = Object.assign({ date:null, done:false }, s.daily||{});
  out.settlement.buildings = Object.assign({}, d.settlement.buildings, (s.settlement&&s.settlement.buildings)||{});
  out.settlement.workers = Object.assign({}, d.settlement.workers, (s.settlement&&s.settlement.workers)||{});
  out.stats.byEnemy = Object.assign({}, (s.stats&&s.stats.byEnemy)||{});
  out.gear = Object.assign({}, d.gear, s.gear||{});
  out.gearBag = s.gearBag || [];
  out.combat = { active:false };
  out.quests = s.quests || [];
  out.completedQuests = s.completedQuests || [];
  out.failedQuests = s.failedQuests || {};
  out.achievements = s.achievements || {};
  out.notifications = s.notifications || [];
  out.log = s.log || [];
  return out;
};

/* ---------- character bonuses ---------- */
G.raceData = function () { return G.RACES[G.state.race] || G.RACES.human; };
G.classData = function () { return G.state.cls ? G.CLASSES[G.state.cls] : null; };
G.flatBonus = function (stat) {
  const r = G.raceData(), c = G.classData();
  return (r[stat]||0) + (c ? (c[stat]||0) : 0);
};
G.affixTotals = function () {
  const t = { crit:0, might:0, hp:0, spell:0, def:0, gold:0, energy:0, lifesteal:0 };
  const gear = G.state.gear;
  for (const slot in gear) {
    const it = gear[slot]; if (!it) continue;
    const list = Array.isArray(it.affix) ? it.affix : (it.affix ? [it.affix] : []);
    list.forEach(k => { const a = G.AFFIXES[k]; if (a) t[a.stat] += a.val; });
  }
  return t;
};
G.gearStat = function (slot, prop) {
  const it = G.state.gear[slot]; if (!it || !it.key) return 0;
  const g = G.GEAR[it.key]; if (!g) return 0;
  const r = G.RARITIES[it.rarity] ? G.RARITIES[it.rarity].mult : 1;
  const plusStep = prop === "atk" ? 2.4 : prop === "def" ? 1.6 : prop === "spell" ? 1.8 : 0;
  return (g[prop]||0) * r + (it.plus||0) * plusStep;
};
/* ---- socket gems + gear set bonuses ---- */
G.gemTotals = function () {
  const t = { fire:0, ice:0, poison:0, crit:0, spell:0, def:0, lifesteal:0 };
  const gear = G.state.gear;
  for (const slot in gear) { const it = gear[slot]; if (!it || !it.gems) continue;
    it.gems.forEach(g => { const gem = G.GEMS[g]; if (gem && t[gem.stat] !== undefined) t[gem.stat] += gem.val; }); }
  return t;
};
G.setBonuses = function () {
  const out = {};
  const worn = Object.keys(G.state.gear).map(s => G.state.gear[s] && G.state.gear[s].key).filter(Boolean);
  for (const sid in G.GEAR_SETS) {
    const set = G.GEAR_SETS[sid];
    const n = set.pieces.filter(p => worn.indexOf(p) >= 0).length;
    if (n >= 2 && set.b2) for (const k in set.b2) out[k] = (out[k]||0) + set.b2[k];
    if (n >= 3 && set.b3) for (const k in set.b3) out[k] = (out[k]||0) + set.b3[k];
  }
  return out;
};
G.activeSets = function () {
  const worn = Object.keys(G.state.gear).map(s => G.state.gear[s] && G.state.gear[s].key).filter(Boolean);
  const res = [];
  for (const sid in G.GEAR_SETS) { const set = G.GEAR_SETS[sid]; const n = set.pieces.filter(p => worn.indexOf(p) >= 0).length;
    if (n >= 2) res.push({ id:sid, name:set.name, emoji:set.emoji, n, total:set.pieces.length, desc:set.desc, active:n>=3 ? 3 : 2 }); }
  return res;
};
G.elemMult = function (element) { const g = G.gemTotals(); return 1 + (g[element] || 0); };

G.maxHp = function () {
  const a = G.affixTotals(), sb = G.setBonuses();
  const v = Math.floor(G.state.maxHp + a.hp + (sb.hp||0) + (G.state.settlement.buildings.barracks||0)*8 + G.flatBonus("hp"));
  return Math.max(1, v);          // never zero — it is used as a divisor for the HP bar
};
G.maxEnergy = function () {
  const a = G.affixTotals(), sb = G.setBonuses();
  const v = Math.floor(G.state.maxEnergy + a.energy + (sb.energy||0) + G.flatBonus("energy"));
  return Math.max(1, v);          // never zero — used as a divisor for the energy bar
};
G.maxNerve = function () { return Math.max(1, Math.floor(G.state.maxNerve)); };

G.atkPower = function () {
  const p = G.state, a = G.affixTotals(), sb = G.setBonuses();
  return 4 + (p.attrs.might + a.might)*1.6 + p.skills.swords*2.2 + (sb.atk||0) + G.gearStat("weapon","atk") + G.gearStat("offhand","atk");
};
G.defPower = function () {
  const p = G.state, a = G.affixTotals(), sb = G.setBonuses();
  return p.attrs.vitality*0.9 + p.skills.stealth*0.6 + a.def + G.flatBonus("def") + G.gemTotals().def + (sb.def||0)
    + G.gearStat("armor","def") + G.gearStat("offhand","def") + G.gearStat("helmet","def") + G.gearStat("boots","def") + G.gearStat("amulet","def");
};
G.spellPower = function () {
  const p = G.state, a = G.affixTotals(), sb = G.setBonuses();
  return 6 + p.attrs.sorcery*2.8 + p.skills.magic*3 + a.spell + G.flatBonus("spell") + G.gemTotals().spell + (sb.spell||0)
    + G.gearStat("weapon","spell") + G.gearStat("offhand","spell") + G.gearStat("ring","spell") + G.gearStat("amulet","spell") + G.gearStat("helmet","spell") + G.gearStat("armor","spell");
};
G.critChance = function () {
  const p = G.state, a = G.affixTotals(), sb = G.setBonuses();
  let c = 0.05 + p.attrs.finesse*0.015 + p.skills.stealth*0.01 + a.crit + G.flatBonus("crit") + G.gemTotals().crit + (sb.crit||0);
  c += G.gearStat("weapon","crit") + G.gearStat("helmet","crit");
  return Math.min(0.85, c);
};
G.critMult = function () { const c = G.classData(); return 1.8 + (c ? (c.critDmg||0) : 0); };
G.fleeChance = function () {
  const p = G.state;
  let f = 0.42 + p.attrs.finesse*0.02 + p.skills.stealth*0.03 + G.flatBonus("flee") + (G.setBonuses().flee || 0) + G.gearStat("boots","flee") + G.gearStat("offhand","flee");
  return Math.min(0.92, f);
};
G.lifesteal = function () { return G.affixTotals().lifesteal + G.flatBonus("lifesteal") + G.gemTotals().lifesteal; };
G.doubleStrike = function () { const c = G.classData(); return c ? (c.doubleStrike||0) : 0; };
G.goldMult = function () {
  let m = 1 + G.affixTotals().gold + (G.classData() ? (G.classData().goldBonus||0) : 0);
  const trade = G.state.settlement.buildings.market || 0;
  return m + trade * 0.03;
};
G.xpMult = function () { return (G.raceData().xpMult || 1); };
G.diff = function () { return G.DIFFICULTY[G.state.difficulty] || G.DIFFICULTY.normal; };
G.playerResist = function (element) {
  const r = G.raceData();
  if (element === "fire" && r.fireResist) return r.fireResist;
  if (element === "dark" && r.darkResist) return r.darkResist;
  return 0;
};

/* ---------- time ---------- */
const PHASES = ["Dawn","Day","Dusk","Night"];
G.phaseName = function () { return PHASES[G.state.time.phase] || "Day"; };
G.isNight = function () { return G.state.time.phase === 3; };

/* ---------- log / xp ---------- */
G.log = function (msg) { if (!G.state) return; G.state.log.unshift(msg); if (G.state.log.length > 50) G.state.log.pop(); };
G.xpNeeded = function () { return Math.floor(100 * Math.pow(1.2, G.state.level - 1)); };
G.gainXP = function (amt) {
  const p = G.state;
  p.xp += Math.round(amt * G.xpMult());
  while (p.xp >= G.xpNeeded()) {
    p.xp -= G.xpNeeded();
    p.level++;
    p.maxHp += 20; p.maxEnergy += 8; p.maxNerve += 2;
    p.hp = G.maxHp(); p.energy = G.maxEnergy();
    p.ap += 3; p.sp += 1;
    G.log(`⭐ Level ${p.level}! +3 AP, +1 SP, +20 HP, +8 energy.`);
    G.notify("good", `Level ${p.level}!`, "+3 AP · +1 SP · +20 HP · +8 energy");
    G.Sound.play("levelup");
    if (G.setQuestProgress) G.setQuestProgress("level", "any", p.level);
    if (G.unlockClassMissions) G.unlockClassMissions();
  }
};

/* ---------- achievements ---------- */
G.unlockAchievement = function (a) {
  const p = G.state;
  // accept an achievement object or just its id — a mod (or a console call)
  // passing an id used to produce a toast that read "undefined"
  if (typeof a === "string") a = G.ACHIEVEMENTS.find(x => x.id === a);
  if (!a || !a.id) return;
  if (p.achievements[a.id]) return;
  p.achievements[a.id] = Date.now();
  G.log(`🏅 Achievement: ${a.name}`);
  G.notify("good", `🏅 ${a.name}`, a.desc);
  G.Sound.play("levelup");
};
G.checkAchievements = function () {
  const p = G.state; if (!p) return;
  G.ACHIEVEMENTS.forEach(a => { if (!p.achievements[a.id]) { try { if (a.check(p)) G.unlockAchievement(a); } catch (e) {} } });
};

/* ---------- tick ---------- */
G.tick = function () {
  const p = G.state; if (!p) return;
  p.stats.timePlayed = (p.stats.timePlayed||0) + 3;
  p.time.ticks++;
  if (p.time.ticks % 24 === 0) { p.time.phase = (p.time.phase+1)%4; if (p.time.phase === 0) { p.time.day++; G.log(`🌅 Day ${p.time.day} dawns.`); } }

  let regen = Math.max(2, Math.floor(G.maxHp()*0.02));
  if (p.settlement.buildings.shrine) regen += p.settlement.buildings.shrine * 3;
  if (p.hp < G.maxHp()) p.hp = Math.min(G.maxHp(), p.hp + regen);
  if (p.energy < G.maxEnergy()) p.energy = Math.min(G.maxEnergy(), p.energy + 2);
  if (p.nerve < G.maxNerve()) p.nerve = Math.min(G.maxNerve(), p.nerve + 1);

  const s = p.settlement, b = s.buildings, w = s.workers || {};
  if (s.level > 0) {
    const inc = s.level*2 + (b.tavern||0)*3 + (w.tavern||0)*2;
    p.gold += inc; s.treasury += inc; p.stats.goldEarned += inc;
    if (b.farm) p.inv.food = (p.inv.food||0) + b.farm + (w.farm||0);
    if (b.mine) p.inv.iron = (p.inv.iron||0) + b.mine + (w.mine||0);
  }
  if (p.underworld.heat > 0 && p.time.ticks % 3 === 0) p.underworld.heat = Math.max(0, p.underworld.heat - 1);

  const m = p.market;
  m.wood = G.clamp(m.wood+G.rndInt(-2,2),5,22); m.iron = G.clamp(m.iron+G.rndInt(-3,3),9,32);
  m.leather = G.clamp(m.leather+G.rndInt(-2,2),6,26); m.ruby = G.clamp(m.ruby+G.rndInt(-5,5),38,110);
  m.food = G.clamp(m.food+G.rndInt(-1,1),4,14); m.fish = G.clamp(m.fish+G.rndInt(-1,2),5,16);
  m.herb = G.clamp(m.herb+G.rndInt(-2,2),6,20); m.ore = G.clamp(m.ore+G.rndInt(-4,4),16,44);

  if (G.maybeSpontaneousEvent) G.maybeSpontaneousEvent();
  if (G.caravanTick) G.caravanTick();
  G.checkAchievements();
  if (G.settings.autosave) G.save();
  // the status bar always refreshes; the panel only rebuilds when the active
  // tab shows values the tick changes (market prices, settlement income, …)
  G.updateStatus();
  if (!p.combat.active && document.getElementById("view-container")) {
    if (G.LIVE_TABS && G.LIVE_TABS[G.tab]) G.renderView();
  }
};

/* ---------- utils ---------- */
G.rndInt = function (a,b) { return Math.floor(Math.random()*(b-a+1))+a; };
G.roll = function (spread) { return 0.85 + Math.random()*spread; };
G.clamp = function (v,a,b) { return Math.max(a, Math.min(b, v)); };
G.fmt = function (n) { return Math.floor(n).toLocaleString("en-IN"); };
G.pick = function (arr) { return arr[Math.floor(Math.random()*arr.length)]; };
G.addRep = function (faction, amt) { const p = G.state; if (p.reputation[faction] === undefined) return; p.reputation[faction] = G.clamp(p.reputation[faction]+amt, -200, 200); if (amt) G.log(`🤝 ${faction} reputation ${amt>0?"+":""}${amt}.`); };

/* ---------- boot / flow ---------- */
/* NOTE: the real boot sequence lives in js/boot.js — it overrides this. */
/* ---------- game modes: a mod may declare a whole separate game ----------
   "Chronicles" is the base game. A mod can register another mode (the villain
   arc does), and its content is only applied while that mode is active — so
   the two games never bleed into each other. Switching mode reloads the page. */
G.MODES = {
  chronicles: {
    id: "chronicles", name: "Chronicles", accent: "#e0b34d",
    desc: "The original campaign — eight hero classes, eight races, the story as written.",
    classes: null,
  },
};
G.registerMode = function (m) {
  if (!m || !m.id || m.id === "chronicles") return;
  G.MODES[m.id] = Object.assign({ classes: null, heroesHidden: false }, m);
};
G.modeList = function () { return Object.keys(G.MODES).map(k => G.MODES[k]); };
G.activeModeId = function () { const id = G.settings && G.settings.mode; return G.MODES[id] ? id : "chronicles"; };
G.activeMode = function () { return G.MODES[G.activeModeId()]; };

/* which classes the creation screen offers in the active mode */
G.modeClassIds = function () {
  const m = G.activeMode();
  const all = Object.keys(G.CLASSES);
  if (m && m.classes && m.classes.length) return m.classes.filter(k => G.CLASSES[k]);
  const hide = (m && m.hideClasses) || [];
  return all.filter(k => hide.indexOf(k) < 0);
};

/* switching games changes what gets loaded, so it needs a fresh page */
G.setMode = function (id) {
  if (!G.MODES[id] || id === G.activeModeId()) return;
  G.settings.mode = id;
  G.saveSettings();
  try { location.reload(); } catch (e) { if (G.renderStart) G.renderStart(); }
};

/* ---------- editions: base game vs art packs, chosen at the start ---------- */
G.EDITIONS = function () {
  const packs = (G.graphicsPackList ? G.graphicsPackList() : []).map(p => ({ id:p.id, name:p.name, pack:p }));
  return [{ id:null, name:"Classic", note:"Emoji art \u00b7 smallest download" }]
    .concat(packs.map(p => ({ id:p.id, name:p.name, note:"Illustrated art pack" })));
};
G.editionNote = function (id) {
  const e = G.EDITIONS().find(x => x.id === (id || null));
  return e ? e.note : "";
};
G.setEdition = function (id) {
  G.settings.graphics = id || null;
  G.saveSettings();
  // choosing an art pack is the same decision as enabling its mod, so keep the
  // two in step — and turn every other art pack off
  if (G.modForPack && G.setModEnabled) {
    const chosen = id ? G.modForPack(id) : null;
    if (chosen && !G.modEnabled(chosen.id)) G.modPrefs.enabled[chosen.id] = true;
    G.graphicsMods().forEach(d => {
      const shouldBeOn = !!(chosen && d.id === chosen.id);
      // compare against the RESOLVED value: an unset pref means "on", so
      // checking the raw pref left mods stuck on.
      if (G.modEnabled(d.id) !== shouldBeOn) G.modPrefs.enabled[d.id] = shouldBeOn;
    });
    if (G.saveModPrefs) G.saveModPrefs();
    if (G.rebuildMods) G.rebuildMods();
  }
  if (G.applyGraphicsPack) G.applyGraphicsPack(id || null);
  if (G.refreshBackground) G.refreshBackground();
  G.renderStart();
  if (G.render && G.state) G.render();
};

G.renderStart = function () {
  // localise the static start-screen text
  const setT = (id, key) => { const el = document.getElementById(id); if (el) el.textContent = G.t(key); };
  setT("start-sub", "ui.tagline");
  const mode = G.activeMode();
  const sd = document.getElementById("start-desc");
  if (sd) sd.textContent = (mode && mode.startDesc) ? mode.startDesc : G.t("ui.startdesc");
  setT("h-mode", "ui.game");
  setT("h-edition", "ui.edition");
  setT("h-slots", "ui.chooseslot");
  // game-mode picker (only once a mod has declared a second game)
  const mr = document.getElementById("mode-row");
  if (mr) {
    const modes = G.modeList();
    const wrap = mr.parentElement;
    if (modes.length > 1) {
      mr.innerHTML = modes.map(m =>
        `<button class="chip ${G.activeModeId() === m.id ? "on" : ""}" title="${String(m.desc || "").replace(/"/g, "&quot;")}" onclick="Game.setMode('${m.id}')">${m.name}</button>`
      ).join("");
      if (wrap) wrap.classList.remove("hidden");
      const note = document.getElementById("mode-note");
      if (note) note.textContent = G.activeMode().desc || "";
    } else if (wrap) wrap.classList.add("hidden");
  }
  // edition picker
  const er = document.getElementById("edition-row");
  if (er) {
    const cur = G.settings.graphics || null;
    er.innerHTML = G.EDITIONS().map(e =>
      `<button class="chip ${cur === e.id ? "on" : ""}" onclick="Game.setEdition(${e.id ? `'${e.id}'` : "''"})">${e.name}</button>`
    ).join("");
    const note = document.getElementById("edition-note");
    if (note) note.textContent = G.editionNote(cur);
  }
  const box = document.getElementById("slot-list"); if (!box) return;
  box.innerHTML = G.listSlots().map(s => {
    const m = s.meta;
    const loading = !m && G.store && !G.store.isReady();
    const label = m
      ? `${m.name||G.t("nav.hero")} · ${G.t("ui.level")} ${m.level} · ${m.cls ? G.clsName(m.cls) : "—"} · ${m.play}m`
      : (loading ? "Loading saves…" : "Empty — click to start");
    const sel = G._pickedSlot === s.slot ? " sel" : "";
    return `<button class="slot-btn${sel}" onclick="Game.chooseSlot(${s.slot})"><span class="slot-num">Slot ${s.slot}</span><span class="slot-info ${m?"":"muted"}">${label}</span></button>`;
  }).join("");
};
G.chooseSlot = function (i) {
  G._pickedSlot = i;
  const raw = G.loadSlot(i);
  const box = document.getElementById("slot-choice");
  if (!box) return;                       // never throw on a missing container
  box.innerHTML = raw
    ? `<p class="muted small">This slot has a saved game.</p>
       <button class="btn btn-primary btn-block" onclick="Game.continueGame(${i})">▶ ${G.t("ui.continue")}</button>
       <button class="btn btn-block btn-danger" onclick="Game.newGame(${i})">✦ ${G.t("ui.newgame")} (overwrites)</button>`
    : `<p class="muted small">Empty slot — choose a difficulty.</p>
       <div class="diff-row">
         <button class="btn" onclick="Game.newGame(${i},'story')">Story</button>
         <button class="btn btn-primary" onclick="Game.newGame(${i},'normal')">Normal</button>
         <button class="btn" onclick="Game.newGame(${i},'hard')">Hard</button>
         <button class="btn btn-danger" onclick="Game.newGame(${i},'brutal')">Brutal</button>
       </div>`;
};

/* ---------- save files ----------
   Export writes a small .json file you can keep or move between devices.
   Import accepts that file, or the older base64 string. */
G.SAVE_FORMAT = "aethelgard-save";

G.wrapSave = function (state) {
  return { format: G.SAVE_FORMAT, version: 1, game: G.GAME_VERSION,
           exported: new Date().toISOString(), state: state };
};

G.exportSaveFile = function (slot) {
  const i = slot || G.state.slot || 1;
  const raw = G.store.get(slotKey(i)) || (G.state && G.state.slot === i ? JSON.stringify(G.state) : null);
  if (!raw) { G.notify("warning", "Nothing to export", "That slot is empty."); return; }
  let state; try { state = JSON.parse(raw); } catch (e) { G.notify("bad", "Export failed", "The save could not be read."); return; }
  const blob = new Blob([JSON.stringify(G.wrapSave(state), null, 1)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const name = "aethelgard-" + (state.name || "hero").replace(/[^a-z0-9]+/gi, "-").toLowerCase()
             + "-slot" + i + ".json";
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
  G.notify("good", "Save exported", name);
};

G.parseSaveText = function (txt) {
  txt = (txt || "").trim();
  if (!txt) return null;
  let obj = null;
  try { obj = JSON.parse(txt); } catch (e) {}
  if (!obj) {                                   // the old base64 form
    try { obj = JSON.parse(decodeURIComponent(escape(atob(txt)))); } catch (e) { return null; }
  }
  if (obj && obj.format === G.SAVE_FORMAT && obj.state) obj = obj.state;
  return (obj && typeof obj === "object" && obj.level != null) ? obj : null;
};

/* import into the first free slot, or overwrite slot 1 if they are all taken */
G.importSaveData = function (obj, slot) {
  // Refuse FIRST, before migrate() touches it and before anything is written:
  // whatever this accepts, loadSlot() must be able to read back.
  const problems = G.saveProblems(obj);
  if (problems.length) return G.importRefused(problems[0]);
  const state = G.migrate(obj);
  const after = G.saveProblems(state);          // migrate() fills holes; prove it did
  if (after.length) return G.importRefused(after[0]);
  const clash = G.saveModeConflict(state);
  if (clash) return G.importRefused(clash);
  let target = slot;
  if (!target) {
    target = 1;
    for (let i = 1; i <= 3; i++) { if (!G.store.get(slotKey(i))) { target = i; break; } }
  }
  state.slot = target;
  state.modeId = state.modeId || G.activeModeId();
  G.store.put(slotKey(target), JSON.stringify(state));
  G._pickedSlot = target;
  if (G.renderStart) G.renderStart();
  G.notify("good", "Save imported", "Loaded into slot " + target + ".");
  return target;
};

G.importSaveFile = function (input) {
  const f = input && input.files && input.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    const obj = G.parseSaveText(String(reader.result));
    if (!obj) { G.notify("bad", "Not a valid save", "That file could not be read as an Aethelgard save."); return; }
    G.importSaveData(obj);
  };
  reader.onerror = () => G.notify("bad", "Could not read the file", "");
  reader.readAsText(f);
  input.value = "";
};

G.importSavePaste = function () {
  const d = prompt("Paste your save data (or the contents of a .json save file):");
  if (!d) return;
  const obj = G.parseSaveText(d);
  if (!obj) { G.notify("bad", "Not a valid save", "That text could not be read as an Aethelgard save."); return; }
  G.importSaveData(obj);
};

G.newGame = function (slot, difficulty) {
  G.pendingSlot = slot; G.pendingDifficulty = difficulty || "normal";
  G.pendingMode = G.activeModeId();
  if (G.showCreation) G.showCreation(); else { G.state = G.defaultState(slot, difficulty); G.seed(); G.begin(); }
};
G.continueGame = function (slot) {
  const raw = G.loadSlot(slot);
  if (!raw) return G.newGame(slot, "normal");
  G.state = G.migrate(raw);
  G.begin();
  // a story mod may have added chapters since this save was made
  if (G.storyResume) { try { G.storyResume(); G.render(); } catch (e) {} }
};
G.applyRaceClass = function () {
  const p = G.state;
  const r = G.RACES[p.race], c = p.cls ? G.CLASSES[p.cls] : null;
  if (r) for (const k in r.bonus) p.attrs[k] = (p.attrs[k]||0) + r.bonus[k];
  if (c) {
    for (const k in c.bonus) p.attrs[k] = (p.attrs[k]||0) + c.bonus[k];
    if (c.startGear) for (const slot in c.startGear) if (G.GEAR[c.startGear[slot]]) p.gear[slot] = { key:c.startGear[slot], plus:0, rarity:"common", affix:[] };
  }
  p.hp = G.maxHp(); p.energy = G.maxEnergy();
};
G.seed = function () {
  const p = G.state;
  G.addQuest({ id:"q_supply", type:"side", name:"Supply Run", desc:"Gather 10 Wood from the The Wilds.", objective:{ type:"gather", target:"wood", required:10 }, rewards:{ gold:60, xp:40 }, unlocks:["Woodcutting knowledge"], prepare:["Travel to the The Wilds","Chop wood — it costs 5 energy each time"] });
  G.addQuest({ id:"q_forge", type:"side", name:"First Forging", desc:"Craft any item at the Forge.", objective:{ type:"craft", target:"any", required:1 }, rewards:{ gold:50, xp:30 }, unlocks:["Crafting"], prepare:["Gather wood and leather first","Potions are the cheapest recipe"] });
  G.startChapter();
  G.log(`You awaken in the The Wilds. The road ahead is yours to write.`);
  G.log(`Tip: gather, hunt, and grow strong before facing the Cult.`);
};
G.begin = function () {
  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("app").classList.remove("app-hidden");
  if (!G._timer) G._timer = setInterval(() => G.tick(), 3000);
  G.applySettings();
  if (G.applyNav) G.applyNav();
  G.switchTab(G.tab || "story");
  G.render();
  G.save();
  G.Sound.init();
  G.notify("info", "Welcome to Aethelgard", "Your adventure begins.");
};
})();
