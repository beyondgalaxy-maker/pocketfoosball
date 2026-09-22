# Pocket Foosball — Touchline 08

A browser foosball game for touchscreens, mouse and keyboard. Current version: **8.0.1**.

## Play online

The complete game is in this repository. GitHub Pages was **not enabled** at the release check on September 22, 2026.

Open **Settings → Pages → Build and deployment → Deploy from a branch**, choose **main** and **/(root)**, then **Save**. No build command, package installation, account in the game, or API key is needed. Once GitHub completes deployment, the address is:

**https://beyondgalaxy-maker.github.io/pocketfoosball/**

The verification workflow tests the game and saves a downloadable artifact; it does not enable Pages or claim that deployment has happened.

## What changed

**Rolling that matches the table:** the soccer panels use the table's actual camera projection, physical ball radius and simulation orientation. Position drift and angular integration use the same substep timing. Real skids, backspin and airborne spin are retained. Fast rotation gets a small sampled blur instead of a fake slower spin.

**Visible stuck-ball recovery:** a genuinely unreachable resting ball shows a three-second warning and a manual re-serve button, including in Table only mode. Recovery then starts the normal one-second ready period. Pausing freezes the countdown; a newly playable ball cancels it. Auto re-serve can be disabled.

**Adaptive opponents:** Expert and Elite re-read moving defenders and retain bounded shot-outcome experience between rallies. New matches start fresh. Keepers have a deliberate physical release for persistent back-rail clamps rather than trying the same blocked stroke forever.

**Cleaner menu:** Match, Controls and Display tabs; named opponent cards; all five skill levels for each profile; a persistent Play/Resume button; Table only, Side view and All controls presets.

## Controls

Drag an on-table handle or its dock to slide and rotate the whole rod. Landscape: up/down slides, left strikes for Mint. Portrait: left/right slides, up strikes for Mint. Coral's touch controls face the opposite player in shared-screen mode.

Mint's keyboard rows, left to right in landscape:

| Row | Slide | Shoot |
| --- | --- | --- |
| Keeper | Q / A | Z |
| Defense | W / S | X |
| Midfield | E / D | C |
| Attack | R / F | V |

Hold **Shift or Space** for faster sliding. **Alt + shot** is a soft pass. **1–4** selects a rod, **G** pins/releases, **B** raises/lowers, and **P** pauses. Mouse and keyboard work together. Fine speed, fast speed, power, pointer slide and pointer rotation have separate settings.

A slow deliberate raise stays at its angle. A fast whip followed by release can auto-ready. Holding still after a whip preserves the selected angle. In Table only mode, holding a handle still briefly arms a nearby slow-ball pin.

## Opponents

Bob favors quick attacks; Maya builds passes; Theo prefers controlled pins; Iris reads openings; Kai favors combinations. Every profile supports Easy, Medium, Hard, Expert and Elite. There are 13 move families, not every professional trick. These are fictional skill profiles, not rated Elo opponents.

## Source, build and tests

The repository root is the deployable site. `engine.js`, `input.js` and `app.js` are compact deployment files. The commented `rolling.js` and `bot-control.js` modules contain the latest rendering/integration and keeper-recovery changes.

Run `python3 build.py` to produce a standalone **touchline.html** and **site/index.html**. Run `node v8-tests.cjs` for the 27 focused checks also run by GitHub Actions. The accompanying source package contains the larger numerical and emulated-browser regression suites and their reports.

See **VALIDATION.md** for measured results and limits. This is an assisted, tuned simulation—not a calibrated real table, a full tournament-rules implementation, or a verified professional-strength opponent. Physical-phone and Safari testing remain outstanding. Two-player mode is local/shared-screen, not network multiplayer.
