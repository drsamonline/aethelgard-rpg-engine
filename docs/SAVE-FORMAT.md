# Saves

## How saving works

**Autosave is on by default.** The game saves every 3 seconds while you play,
and again after any significant action (travelling, buying, crafting, winning a
fight, finishing a chapter). You can turn it off in **Settings → Autosave**.

There is no separate "checkpoint" system. The save is the complete live state —
level, HP, energy, gold, inventory, gear, quests, story chapter, flags,
settlement, map position, achievements and statistics.

## What a returning player loads

Clicking **Continue** on a save slot loads that state exactly as it was. You
come back to the same character, in the same place, with the same quest in
progress — not to the start of a chapter.

If a **story mod** added chapters since the save was made, the game notices and
drops you into the next new chapter, keeping everything else. Nothing is reset.

## Slots

Three slots, and each game mode keeps its own. Slot 1 in Chronicles and slot 1
in The Crown's Shadow are different characters and neither game can load the
other's.

Under the hood:

```
aethelgard_v7_slot1            Chronicles
aethelgard_v7_villain_slot1    The Crown's Shadow
```

## Export and import

On the title screen:

- **Export slot** — downloads `aethelgard-<name>-slot<N>.json`
- **Import save** — pick a `.json` file you exported earlier
- **Paste save** — paste the file's contents, or the older base64 string

In game: **Menu & Save → Export / Import**.

An exported file looks like this:

```json
{
  "format": "aethelgard-save",
  "version": 1,
  "game": "1.0.0",
  "exported": "2026-10-16T09:00:00.000Z",
  "state": { "...": "the full game state" }
}
```

Import accepts that wrapper, a bare state object, or the old base64 form, so
saves from any earlier build still load. Imported saves go to the first free
slot, or overwrite slot 1 if all three are taken.

## Moving a save between devices

Export on one device, import on the other. Nothing is sent anywhere — the file
is created and read entirely in your browser.

## If a save will not load

The game validates saves and skips a corrupt one rather than crashing, with a
warning in the console. The most common cause of an unreadable save is a file
from a much older version; exporting from the old build and importing into the
new one is the reliable route.

**Import is checked before anything is written.** A file is refused — and no
slot is touched — when it is not a save object, when its `level` is not a
number, when its `attributes` are missing, or when it belongs to the *other*
game (Chronicles and The Crown's Shadow keep separate slots and cannot load
each other's characters). The message names the reason. A file that imports
cleanly will always load; that is what `test10.js` pins.
