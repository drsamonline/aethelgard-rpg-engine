<div align="center">

# ⚙️ Aethelgard RPG Engine

**A dependency-free, vanilla-JavaScript engine for deep, single-player browser RPGs.**
No build step, no dependencies, works offline — small modules loaded in script order behind one global (`window.Game`).

[![Landing page](https://img.shields.io/badge/▶_landing_page-live-60a5fa?style=for-the-badge)](https://drsamonline.github.io/aethelgard-rpg-engine/)
[![All projects](https://img.shields.io/badge/All%20projects-drsamonline.github.io-60a5fa?style=for-the-badge)](https://drsamonline.github.io/)
[![Play the game](https://img.shields.io/badge/▶_play_the_game_it_powers-8B5CF6?style=for-the-badge)](https://drsamonline.github.io/aethelgard-games/play/chronicles/)

[![License: PolyForm Noncommercial 1.0.0](https://img.shields.io/badge/license-PolyForm%20Noncommercial%201.0.0-green?style=flat-square)](LICENSE)
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

<!-- shot:start -->
<img src="docs/assets/app-desktop.png" alt="The app on its main screen" width="100%">
<!-- shot:end -->

## ▶️ See it in action

This engine powers **Aethelgard: Chronicles of Fate**, a deep single-player RPG.
Play it here:

**[drsamonline.github.io/aethelgard-games/play/chronicles/](https://drsamonline.github.io/aethelgard-games/play/chronicles/)**

Both Aethelgard games live in **[drsamonline/aethelgard-games](https://github.com/drsamonline/aethelgard-games)**.
The visual novel runs on its own engine, [Saga](https://github.com/drsamonline/saga-vn-engine).

## Run it

The engine is plain ES modules with no build step and no page of its own: this
repository ships the **engine**, while the page, the mods folder and the two
playable games live in
**[drsamonline/aethelgard-games](https://github.com/drsamonline/aethelgard-games)**.
To try the engine, serve this folder and import `js/boot.js` after the data files
from a page of your own (ES modules need http, not `file://`):

```bash
python3 -m http.server 8000
```

No install, no dependencies. Any static server works (`npx serve`, nginx, GitHub
Pages — anything). The one test suite runs in plain Node:

```bash
node test8.js && node test9.js
```

## Project layout

```
style.css             the look
manifest.json         the PWA manifest (the page it names lives in aethelgard-games)
sw.js                 the offline cache; its precache list is pinned to this repo by test9.js
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
test8.js, test9.js    the suites CI runs (static audit; service worker)
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

## Support

<img src="docs/assets/support-portrait.jpg" width="72" height="72" alt="Dr. Sohil Momin" align="left" style="border-radius:50%;margin-right:1rem">

Free, offline, accountless — and staying that way. If it earned its keep:

| | |
|---|---|
| UPI (India) | `drsohilboi@ybl` — payee Dr. Sohil Momin, open amount, or scan [the QR](docs/assets/upi-qr.svg) |
| Ko-fi | [ko-fi.com/matneo](https://ko-fi.com/matneo) |
| PayPal | [paypal.me/drsohilmomin](https://paypal.me/drsohilmomin?locale.x=en_GB&country.x=IN) |
| My books | [Amazon author store](https://www.amazon.com/stores/author/B08ZT331LY/allbooks?ccs_id=aed72b9f-71d9-41dc-adee-e9368a317acc) |
| More apps | [drsamonline.github.io](https://drsamonline.github.io/) |
| Email | [sohilmomin2000@gmail.com](mailto:sohilmomin2000@gmail.com) |

Nothing is gated behind it: no accounts, no tracking, no network requests.

## Licence

**MIT.** The engine — all JavaScript, HTML, CSS, JSON and tooling in this
repository — is free software under the [PolyForm Noncommercial Licence](LICENSE). Use it, fork
it, ship it.

The *Aethelgard* games' story, characters and artwork are a separate work,
© Dr. Sohil Momin, all rights reserved, and are **not** part of this
repository or of the MIT grant.

---

<p align="center"><sub>Made with plain JavaScript by <strong>Dr. Sohil Momin</strong></sub></p>
