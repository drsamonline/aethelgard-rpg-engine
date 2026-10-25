<div align="center">

# ⚙️ Aethelgard RPG Engine

**A dependency-free, vanilla-JavaScript engine for deep, single-player browser RPGs.**
No build step, no dependencies, works offline — small modules loaded in script order behind one global (`window.Game`).

[![Landing page](https://img.shields.io/badge/▶_landing_page-live-60a5fa?style=for-the-badge)](https://drsamonline.github.io/aethelgard-rpg-engine/)
[![All projects](https://img.shields.io/badge/All%20projects-drsamonline.github.io-60a5fa?style=for-the-badge)](https://drsamonline.github.io/)
[![Play the game](https://img.shields.io/badge/▶_play_the_game_it_powers-8B5CF6?style=for-the-badge)](https://drsamonline.github.io/aethelgard-games/play/chronicles/)

[![License: MIT](https://img.shields.io/badge/license-PolyForm Noncommercial-green?style=flat-square)](LICENSE)
[![No Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen?style=flat-square)](#run-it)
[![No Build Step](https://img.shields.io/badge/build_step-none-informational?style=flat-square)](#run-it)
[![Offline First](https://img.shields.io/badge/offline-first-success?style=flat-square)](#run-it)

</div>

---

**The Aethelgard RPG Engine** is the engine behind *Aethelgard: Chronicles of Fate*.
It ships as **engine only**: a small, generic sample world (four chapters, eight
locations, a handful of classes, races, enemies and gear) so you can see it run
and then build your own RPG on top.

> **The engine is MIT.** The *Aethelgard* games' story, characters and artwork are
> a separate work, © Dr. Sohil Momin, all rights reserved — free to play, not
> open source, and **not contained in this repository**. See [Licence](#licence).

## ▶️ See it in action

This engine powers **Aethelgard: Chronicles of Fate**, a deep single-player RPG.
Play it here:

**[drsamonline.github.io/aethelgard-games/play/chronicles/](https://drsamonline.github.io/aethelgard-games/play/chronicles/)**

Both Aethelgard games live in **[drsamonline/aethelgard-games](https://github.com/drsamonline/aethelgard-games)**.
The visual novel runs on its own engine, [Saga](https://github.com/drsamonline/saga-vn-engine).

## Run it

The engine is plain ES modules with no build step. Serve the folder over http
(opening `index.html` by double-click will not work in most browsers):

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

No install, no dependencies. Any static server works (`npx serve`, nginx, GitHub
Pages — anything).

## Project layout

```
index.html            the page
style.css             the look
js/core.js            state, saves, settings, attributes
js/combat.js          turn-based combat and statuses
js/world.js           the map, travel, dungeons and events
js/quests.js          the story engine (chapters, choices, quests)
js/mods.js            the drop-in mod loader
js/views/             one file per tab (hero, atlas, forge, market, ...)
js/data/              THE SAMPLE WORLD  <- your game's data goes here
  gamedata.js           elements, statuses, items, buildings, locations
  classes.js            classes, skills and class missions
  races.js              playable races and genders
  enemies.js            enemies and bosses
  gear.js               weapons, armour and crafting recipes
  quests.js             the sample story
  ...                   companions, events, gems, music, reactions, wiki, i18n
docs/                 the landing page + design notes
tools/                build and simulation scripts
```

Everything under `js/data/` is a **generic sample** — replace it with your own
game's world.

## Making it yours

The engine ships a small generic sample. To make your own RPG you replace the
data in `js/data/` and, if you want, add your own art. The engine reads its
world, classes, enemies, items and story from those files; nothing else needs to
change.

## Mods

Drop a `.js` file in `mods/` and the engine finds it automatically. Mods can add
content (classes, enemies, items, story) or replace existing entries, with safety
rules so a broken mod can never take a running game down. See `docs/MODDING.md`.

## Documentation

| document | about |
|---|---|
| `docs/` | the landing page and design notes |
| `docs/MODDING.md` | writing a mod |
| `CONTRIBUTING.md` | how to send changes to the engine |
| `CHANGELOG.md` | release history |

## Licence

**MIT.** The engine — all JavaScript, HTML, CSS, JSON and tooling in this
repository — is free software under the [PolyForm Noncommercial Licence](LICENSE). Use it, fork
it, ship it.

The *Aethelgard* games' story, characters and artwork are a separate work,
© Dr. Sohil Momin, all rights reserved, and are **not** part of this
repository or of the MIT grant.

---

<p align="center"><sub>Made with plain JavaScript by <strong>Dr. Sohil Momin</strong></sub></p>
