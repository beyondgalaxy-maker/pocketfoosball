# Pocket Foosball — Touchline 09

A browser foosball game for touchscreens, mouse and keyboard. Current version: **9.0.0**.

## Play online

**https://beyondgalaxy-maker.github.io/pocketfoosball/**

The public HTTPS website is live. On September 22, 2026, the release check opened the actual website in fresh Chromium profiles without a login, verified all six runtime assets against the tested files, played in desktop and phone-sized viewports, and confirmed saved keybindings survive a full page reload. See [V9-NOTES.md](V9-NOTES.md) for measurements and limits.

No GitHub account, game account, installation or API key is needed to play. Reload an already-open tab to load the updated version; the title shows Touchline 09.

## Changes in version 9

**A caught ball settles instead of spinning in place.** Confirmed quiet foot contact gets bounded spin settling, and a supported pin resists residual twisting. When you walk a pin sideways, its visible rotation follows actual constrained centre travel. Free-field rolling, skids, backspin and airborne motion are not subjected to the new catch damping. This remains a tuned assisted-contact model, not real-table calibration.

**Editable keyboard controls.** Open **Menu → Controls → Keyboard · remap keys & sensitivity**. Click a key and press its replacement. Each Mint row has separate up, down and shoot bindings. Expand **Selection, modifiers & second player** for boost, soft-pass, rotation, pin, raise and selection bindings. Escape cancels; Backspace clears the selected binding. Duplicate keys are rejected with the conflicting action named. Restore default keys does not reset sensitivity. Bindings are saved on this browser; blocked storage falls back to the current tab and reports that limitation.

## Controls

Drag an on-table handle or its dock to slide and rotate the whole rod. Landscape: up/down slides, left strikes for Mint. Portrait: left/right slides, up strikes for Mint. Coral's touch controls face the opposite player in shared-screen mode.

Default Mint keyboard rows, left to right in landscape:

| Row | Slide | Shoot |
| --- | --- | --- |
| Keeper | Q / A | Z |
| Defense | W / S | X |
| Midfield | E / D | C |
| Attack | R / F | V |

Default modifiers: **Shift or Space** slides faster, **Alt + shot** makes a soft pass. **1–4** selects a rod, **G** pins/releases, **B** raises/lowers and **P** pauses. These are editable. Escape stays available for the menu and Tab for navigation. Mouse and keyboard work together; a mouse-held rod takes priority over its keys. Fine speed, fast speed, shot power, pointer slide and pointer rotation have separate settings.

A slow deliberate raise stays at its angle. A fast whip followed by release can auto-ready. Holding still after a whip preserves the selected angle. Table only mode hides extra controls while retaining the handles and small menu/restore buttons.

## Modes and opponents

Solo, practice and local shared-screen two-player remain available. Bob favors quick attacks; Maya builds passes; Theo prefers controlled pins; Iris reads openings; Kai favors combinations. Every profile supports Easy, Medium, Hard, Expert and Elite. There are 13 move families, not every professional trick. These are fictional skill profiles, not measured Elo ratings.

A genuinely unreachable resting ball gets a visible auto-recovery countdown, followed by the one-second ready period. Reachable catches are not dead balls. Camera options include the side view, cross-section and Off.

## Build and verification

The repository root is the deployable static site. Run `python3 build.py` to generate standalone `touchline.html` and `site/index.html`.

Run `node v8-tests.cjs` and `node v9-tests.cjs` for the 41 focused numerical/input checks in GitHub Actions. The downloadable source package also contains the larger regression suites: **157 numerical/input checks and 278 local Chromium browser checks passed for v9**.

`site-smoke.py` checks the actual public website with Playwright, not an injected preview. The successful v9 run passed **27 public-site checks**, including normal page navigation, real origin storage, reload, keyboard release and emulated touch input. CI has read-only repository permissions. It does not alter Pages settings or store account credentials.

See [V9-NOTES.md](V9-NOTES.md) for the current report; `VALIDATION.md` records the earlier v8 baseline. Physical-phone hardware and Safari remain untested. The game is an assisted simulation, not a calibrated table, full tournament-rules implementation or verified professional-strength opponent. Two-player is shared-screen, not online network multiplayer.
