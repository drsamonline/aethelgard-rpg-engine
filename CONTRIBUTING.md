# Contributing

Thanks for wanting to help. A few things that will make it go smoothly.

## Reporting a bug

The game has built-in diagnostics and they are the single most useful thing you
can include:

1. Open the game → **Settings → Diagnostics**
2. Press **Copy report**
3. Paste it into your issue

That includes the version, the mode, how many mods are loaded, the storage
state, your viewport and any errors captured this session — each with a
plain-English explanation of what it means.

Please also say **what you did** and **what you expected**.

## Suggesting a feature

Open an issue. If it is a gameplay idea, describe the *feeling* you want, not
just the mechanic.

## Sending code

- Keep the code dependency-free. The whole point is that there is no build step.
- Match the surrounding style: plain ES5-ish JavaScript, `"use strict"`, an IIFE
  per file, everything hung off the `Game` object.
- Run the tests before you open a PR:
  ```bash
  node test8.js && node test9.js && node test10.js
  ```
- If you change the UI, say which browsers you checked.

## Writing a mod instead

If what you want is new content rather than engine changes, a mod is almost
always the better answer — and it will not break when the engine updates.
See [`docs/MODDING.md`](docs/MODDING.md).

## Code of conduct

Be decent to each other. Disagree with the idea, not the person.
