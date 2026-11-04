# Architecture

Aethelgard is plain ES5-ish JavaScript with no build step and no dependencies.
Every file is an IIFE that hangs its public functions off a single global,
`window.Game` (aliased `G`). Load order is the order of the `<script>` tags in
`index.html`; nothing is imported, nothing is bundled.

## Layers

```
index.html          markup + script order
style.css           all styling, CSS custom properties for theming
manifest.json       PWA manifest
sw.js               offline cache (app shell precached, art cached on demand)

js/
  data/             pure data — no logic, no side effects
  *.js              logic, one concern per file
  views/            one module per tab
  boot.js           the startup sequence (runs last)

mods/               drop-in content, auto-discovered at boot
tools/              Python scripts for building art and prompt sheets
```

## The data layer — `js/data/`

Each file declares plain objects and hands them to `Game` via
`Object.assign(window.Game, { ... })`. There is no logic here, which is what
makes the mod system simple: a mod supplies the same shapes and they merge.

| file | holds |
|---|---|
| `gamedata.js` | locations, difficulty, rarities, themes, elements, statuses |
| `races.js` `classes.js` | the eight races and eight classes, plus active skills |
| `enemies.js` | the bestiary |
| `gear.js` `gems.js` | weapons, armour, affixes, sockets, gear sets |
| `quests.js` | chapters, side quests, bounties |
| `achievements.js` `companions.js` `wiki.js` | as named |
| `events.js` `activities.js` | travel events, tavern/arena/cooking activities |
| `music.js` `reactions.js` | procedural music moods, elemental reactions |
| `i18n.js` | interface strings (English) |

## The logic layer — `js/*.js`

| file | responsibility |
|---|---|
| `core.js` | state, derived stats, save/load, storage, game modes, the tick |
| `combat.js` | the turn engine: player turn, enemy phase, statuses, loot |
| `world.js` | travel, local maps, gathering, the market, the settlement |
| `quests.js` | quest tracking, chapter progression, story resume |
| `maps.js` | world map and local map rendering |
| `ui.js` | the shell: tabs, status bar, modals, settings, mod panel |
| `views/*.js` | one module per tab (story, hero, skills, atlas, home, forge, market, underworld, inventory, codex) |
| `wiki.js` | tooltips and the browsable wiki |
| `music.js` | Web Audio procedural soundtrack |
| `mods.js` | discovery, merging, dependency order, compatibility |
| `graphics.js` | sprite lookup, graphics packs, mod-contributed sprites |
| `companions.js` `late-game.js` | companions, ascension, endless dungeon |
| `diagnostics.js` | error capture and the report |
| `boot.js` | startup: settings → title screen → mods → storage |

## Rendering

There is no virtual DOM. Each view returns an HTML string and `render()` assigns
it to `#view-container`. That is deliberate: it keeps the whole engine readable
and makes a mod able to override a view by replacing one function.

Two things keep it fast:

- `render()` is split into `updateStatus()` (cheap, updates numbers) and
  `renderView()` (rebuilds the panel). The 3-second tick only calls
  `renderView()` for tabs that actually show ticking values — `G.LIVE_TABS`.
- Expensive lists (the wiki) are collapsed and paged rather than drawn whole.

## Storage

`G.store` wraps `localStorage` with an in-memory cache. It is **synchronous**,
so a save is durable the instant it is written. A save is about 13 KB, so the
~5 MB budget holds a few hundred.

Slot keys are namespaced by game mode, so the two games never overwrite each
other:

```
aethelgard_v7_slot1          Chronicles
aethelgard_v7_villain_slot1  The Crown's Shadow
```

## Game modes

`G.MODES` holds the registered modes. `Chronicles` is built in; a mod declares
more by supplying a `MODE` block.

While a mode is **not** active, a mod that declares one contributes nothing at
all — its chapters, classes and enemies are not applied. That is what keeps two
games from bleeding into each other. Switching mode reloads the page, because
different content has to be loaded.

## Testing

`test8.js` and `test9.js` are plain Node scripts with a tiny assert helper. No
framework, no config, no browser.

- `test8.js` runs `tools/static-audit.py` and pins its counts, so the documented
  invocation cannot silently start reporting zeros.
- `test9.js` loads `sw.js` into a shimmed service-worker global (`self`, `caches`,
  `fetch` in a `vm` context), fires fetch events at it and asserts what
  `respondWith` was handed: docs (`.md`) go network-first and fall back to the
  cache offline, everything else stays cache-first, and the cache name is bumped.
