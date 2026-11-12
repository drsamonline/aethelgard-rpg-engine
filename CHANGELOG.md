# Changelog

## Unreleased

- **Fixed — import announced a success the next boot would refuse.** The loader
  demanded a numeric `level` and an `attrs` object; the importer demanded only
  that `level` was not null. So `{"level":"seven"}` was "imported", written over
  a slot and reported as a success — and `loadSlot()` then refused it, over the
  save the player had just given up. `G.saveProblems(state)` is now the single
  definition of a loadable save; `validSave()`, `loadSlot()` and
  `importSaveData()` all consult it, and the importer checks before it writes
  and again after `migrate()`, so nothing unloadable can reach a slot.
- **Fixed — a save from the other game imported as a success.** Chronicles and
  The Crown's Shadow keep separate slots and the loader refuses the other game's
  save by design, so the importer must refuse it too; it now names both games in
  the message instead of writing a slot that cannot open.
- **Fixed — a refused import on the title screen showed nothing at all.**
  `notify()` returns early when there is no live `G.state`, which is exactly the
  state the title screen is in, so an import failure was silent. A refusal now
  falls back to a toast, and the reason is specific ("its level is not a
  number") rather than "invalid".
- **Added — `test10.js`**, 33 assertions: it loads the real `js/core.js` into a
  `vm` context with a minimal browser shim and proves that whatever
  `importSaveData()` accepts, `loadSlot()` reads back — plus twelve shapes that
  must be refused, a refused import writing nothing, and the refusal being
  visible with no live state. Mutation-checked: removing the shape guard turns
  5 red, removing the mode guard 3, making the refusal notify-only 3.
- **CI** — the test step ran a hard-coded list (`test6..test9`), so a new suite
  would have been written and never run. It discovers `test*.js` now and fails
  the job on the first red one.

- **Fixed — CI was red, and the assertion was wrong, not the code.** `test8.js`
  demanded `<script>` wiring in `index.html`, which this engine-only repository
  does not ship (the page lives in `drsamonline/aethelgard-games`), so the suite
  failed on every push and took the whole `syntax-and-tests` job with it. The test
  now asks the question the repository can answer: a page means wiring, no page
  means none.
- **Fixed — the offline cache precached 16 files this repo does not ship.** `CORE`
  named `index.html`, the whole `mods/` tree, `HOW_TO_PLAY.md`,
  `AI_ART_PROMPTS.md` and `MOD_ART_PROMPTS.md` — none of which are here. One 404
  makes `cache.addAll()` reject, and the worker's own `.catch()` swallowed it, so
  the shell was never cached at all and nothing reported it. `CORE` is now exactly
  what this repository ships (44 files), and `test9.js` pins it against the disk.
- **Fixed — documentation went stale forever in an installed app.** The fetch
  handler was cache-first for everything, and the cache only refreshes when
  `CACHE` is bumped, so a reader kept the docs of the day they installed. `.md` is
  now network-first with the cache as the offline fallback, and the fresh copy is
  written back. `CACHE` bumped to `aethelgard-v23`.
- **Added — `test9.js`**, a behavioural test for the service worker: it loads
  `sw.js` into a shimmed worker global, fires fetch events at it and asserts what
  `respondWith` received, plus the precache list against the disk. 14 assertions,
  wired into CI beside `test8.js`.
- **Docs** — the README no longer describes a page and a `mods/` folder that are
  not in this repository, and `docs/ARCHITECTURE.md` describes the two suites that
  actually run.

## 1.0.0 — 2026-10-25

- **Licence: PolyForm Noncommercial 1.0.0.** Every repository now carries the canonical text
  from polyformproject.org with the Required Notice line, and the four places a repo states
  its licence agree: LICENSE, the SPDX headers, the README and package.json.
- **The public demo is the app.** A build now fails if `docs/play/index.html` is not the app,
  because a demo running older code is two code paths for one program.






## 1.0.4

**Fixed — audio**
- **A regression I introduced**: hardening the volume code replaced the music
  volume calculation with a reference to a property that does not exist, so
  music always played at 1 instead of its intended 0.08 — about twelve times too
  loud, and ignoring the Music on/off switch and the volume slider. Restored.
- The master gain is now sanitised. A bad stored volume made the Web Audio
  parameter fall back to 1 (it rejects `NaN`), leaving effects ten times too
  loud.
- `Sound.play()` now revives a suspended audio context instead of silently doing
  nothing — which is exactly what "the game has no sound" looks like.
- The audio unlock no longer gives up after a single attempt. It kept listening
  only once; a gesture that arrived before boot finished left the game
  permanently silent. It now retries until the context is actually running, and
  listens for `touchstart` as well.
- The volume slider updates the live master gain immediately.

**Added**
- `tools/audio-test.js` — attaches an analyser to the master output and measures
  the real signal from every sound effect and the music, so "is there audio?"
  has a numeric answer instead of a guess.
- Diagnostics now reports the audio context state, the sound/music switches and
  both volumes.

## 1.0.3

**Fixed**
- Volume could be set to `NaN` or outside 0–1, which throws from the Web Audio
  layer and broke the settings screen. Clamped at both ends.

**Added**
- `tools/verify.js` — end-to-end: every tab, every action, combat, a save
  round-trip, content validation, and both campaigns played to the Open World.
- `tools/sims.js` — twelve simulations (campaigns, isolation, dungeon, economy,
  settlement, companions, achievements, saves, mod toggling, ascension, mobile soak).
- `tools/static-audit.py` — functions, dead code, duplicates, script wiring.
- `docs/AUDIT.md` — the full audit report.

## 1.0.2

**Art**
- The interface icon set is complete: 121 icons — 25 skills, 10 statuses,
  7 buildings, 5 gear sets, 39 achievements, 35 points of interest.
- Regenerated by identifying each icon after cutting rather than naming by grid
  position, which is what fixed the earlier mislabelling.

**Fixed**
- `unlockAchievement` accepted only an achievement object; passing an id
  produced a toast that read "undefined". It now accepts either.
- The two duplicated mod-rebuild functions were merged into one.

**Added**
- `tools/verify.js` — drives both games end to end: every tab, every action,
  combat, a save round-trip, content validation, and a full campaign playthrough
  to the Open World.

## 1.0.1

**Fixed**
- The villain campaign was uncompletable: its objectives named hero enemies that
  were declared but spawned nowhere. All five chapter targets now have lairs.
- Chapter V of the villain campaign crashed on an unknown element (`holy`).
- Chronicles chapter IV was uncompletable — the Coven Leader had no lair. Added
  the Coven Sanctum in the Mire.
- Story mixing: `story-expansion` was not restricted to a game, so its hero-arc
  chapters VII–IX were being appended to the villain campaign. Mods can now
  declare `mode: "chronicles"` to belong to one game only.
- Villain classes referenced starting gear that did not exist, so they began
  unarmed.
- `frost_revenant` used a status (`freeze`) that does not exist.

**Added**
- `tools/validate-content.js` — checks every chapter, quest, enemy, spawn, drop,
  status and element for references that cannot resolve. Also in-game at
  Settings → Diagnostics → Run content check.
- Unknown elements and statuses are now ignored rather than throwing, so a mod
  cannot break the combat screen.
- Story panel names the region a kill objective is in, with a travel button.

**Changed**
- Art packs are mutually exclusive; the creation screen separates content mods
  (switches) from the art-pack choice (single select).
- The two duplicated mod-rebuild functions were merged into one.


## 1.0.1

**Fixed**
- The villain campaign was uncompletable: its objectives named hero enemies that
  were declared but spawned nowhere. All five chapter targets now have lairs.
- Chapter V of the villain campaign crashed on an unknown element (`holy`).
- Chronicles chapter IV was uncompletable — the Coven Leader had no lair. Added
  the Coven Sanctum in the Mire.
- Story mixing: `story-expansion` was not restricted to a game, so its hero-arc
  chapters VII–IX were being appended to the villain campaign. Mods can now
  declare `mode: "chronicles"` to belong to one game only.
- Villain classes referenced starting gear that did not exist, so they began
  unarmed.
- `frost_revenant` used a status (`freeze`) that does not exist.

**Added**
- `tools/validate-content.js` — checks every chapter, quest, enemy, spawn, drop,
  status and element for references that cannot resolve. Also in-game at
  Settings → Diagnostics → Run content check.
- Unknown elements and statuses are now ignored rather than throwing, so a mod
  cannot break the combat screen.
- Story panel names the region a kill objective is in, with a travel button.

**Changed**
- Art packs are mutually exclusive; the creation screen separates content mods
  (switches) from the art-pack choice (single select).
- The two duplicated mod-rebuild functions were merged into one.

## 1.0.0 — final

The first release intended for public use.

**Engine**
- Modular ES5 engine: no framework, no build step, no dependencies.
- Save system rewritten to synchronous `localStorage`. A save is durable the
  moment it is written; the previous async version could lose the last save if
  the page was closed before the write committed.
- Start screen rewritten: slots render immediately, the chosen slot is
  highlighted, and the modal that opens from the title screen now sits **above**
  it (it used to open behind, which looked like nothing happening).
- Export/import on the title screen — real `.json` save files, plus the older
  base64 form.
- Built-in diagnostics: captured errors, each explained in plain English, with
  a copyable and downloadable report.
- Wiki view: search index cached, categories collapsible. Initial HTML dropped
  from 47 KB to 7 KB and the view went from ~71 ms to ~5 ms.
- Two complete game modes, chosen on the title screen.

**Content**
- Eight classes, eight races, nine chapters, five companions, an endless
  dungeon, an underworld, settlement building, crafting, five gear sets.
- Two story mods that ship with the game: a campaign expansion and a full
  villain arc.
- Seven more example mods demonstrating enemies, classes, addons, graphics
  packs and overhauls.

**Interface**
- English only. The lookup mechanism is kept so a mod can add a language, but
  no translation is bundled — story text was never routed through it, so a
  partial translation was worse than none.

**Art**
- 214 sprites, 11 painted region backdrops, 104 art-pack assets, 77 interface
  icons.

## Earlier

Development versions (v1–v6) were built incrementally: engine rebuild,
modularisation, races and classes, story and wiki, procedural music,
companions, late-game content, the mod loader, and the graphics-pack system.
