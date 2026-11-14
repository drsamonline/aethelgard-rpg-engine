/* ============================================================
   Aethelgard — VIEW: Forge
   Created by Dr. Sohil Momin
   ============================================================ */
"use strict";
(function () {
const G = window.Game;
const t = k => G.t(k);
const n = v => G.fmt(v);
const W = k => `data-wiki="${k}"`;
const gearAffix = G.gearAffix;
const questCard = G.questCard;

/* ================= FORGE ================= */
G.viewForge = function () {
  const p = G.state;
  let h = `<div class="panel"><h2>🛠️ The Forge</h2><p class="muted small" style="margin-bottom:14px">Craft <b class="gold-text">Lv ${p.skills.craft}</b> and a Workshop improve rarity. ${t("ui.upgrade")} gear in the Hero tab.</p><div class="stats-grid">`;
  G.recipes().forEach(r => { const costStr = G.recipeCostLine(r), can = G.canCraft(r.key);
    h += `<div class="stat-node" style="flex-direction:column;align-items:stretch;gap:10px" ${W(r.kind==="gear"?"gear_"+r.key:"item_"+r.key)}>
      <div class="sn-left"><span class="sn-name">${G.sprite(r.kind==="gear"?"gear."+r.key:"item."+r.key, r.emoji)} ${r.name}</span><span class="sn-sub">Cost: ${costStr}</span></div>
      <div class="btn-row"><button class="btn btn-sm" style="flex:1" onclick="Game.craftItem('${r.key}')" ${can?"":"disabled"}>${t("ui.craft")}</button><button class="btn btn-sm" onclick="Game.craftMany('${r.key}',5)" ${can?"":"disabled"}>×5</button></div></div>`; });
  h += `</div></div>`;
  return h;
};

})();
