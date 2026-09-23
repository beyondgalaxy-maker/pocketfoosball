# Pocket Foosball — Touchline 10

**Play: https://beyondgalaxy-maker.github.io/pocketfoosball/?v=10**

A browser foosball game for touchscreens, mouse and keyboard. Version **10.0.0** is live and checked without a login. Reload an already-open tab to load Touchline 10. No game account, installation or API key is required.

## New in version 10

**Double-tap a control to ready that row.** Mouse double-click works too. Figures return to their ready angle, releasing an armed pin and cancelling a pending whip. The rod keeps its sideways position. Dragging or holding deliberately is not a double tap.

**Menu → Display → Overlay buttons** floats the four normal handles and PIN button over the full-size table instead of shrinking it to make room for a dock. The small score, menu and restore controls remain visible. The preference is saved; pure Table only and the regular layout are still available. Local two-player adds a mirrored opposing dock.

**Practice Re-serve is always available during play**, including Overlay and Table only, independent of whether the ball is reachable. It resets the current drill.

**Recovery handles small numerical chatter and bot stalls separately.** An unreachable ball that remains in a tiny area can now start the normal three-second recovery countdown even if its speed fluctuates slightly. A bot-held ball first gets physical clearing attempts. Repeated failure can trigger a separately labeled Bot possession timeout, followed by a three-second warning and a re-serve to the human. This last resort is a gameplay safeguard, not proof that every jam is solved physically. Pause, cancellation on progress and the user's auto-recovery setting are respected.

**Medium is softer.** It selects basic direct shots or stick passes, not spray/brush/snake/tic-tac routines. Visual delay is 380 ms, changing to a new handle takes 320 ms, extrapolation is reduced and defense has a lower movement cap. Easy is slower again. Hard, Expert and Elite retain their core shot planning. The five personalities remain; difficulty is not a measured Elo rating.

**PIN is deliberate.** In Overlay mode the visible PIN control replaces automatic hold-to-pin, so a gentle backwards touch need not become a supported pin. Arming PIN with the foot already close above the ball lowers the remaining small angle instead of making a long rotation. Quiet-catch spin settling and camera-correct rolling remain.

## Controls

Drag an on-table handle or its dock to slide and rotate a complete rod. Landscape: up/down slides and left strikes for Mint. Portrait: left/right slides and up strikes for Mint. Coral's controls face the opposite player in shared-screen mode.

Default keyboard columns are Q/A/Z for Keeper, W/S/X for Defense, E/D/C for Midfield, and R/F/V for Attack. Shift or Space slides faster; Alt plus the shot key makes a soft pass. G pins/releases and B raises/lowers. **Menu → Controls → Keyboard · remap keys & sensitivity** changes these bindings. Duplicate bindings are rejected; preferences are saved independently from sensitivity. Mouse and keyboard work together.

A slow raise stays at its angle. A fast whip followed by release can auto-ready; a deliberate hold after the whip preserves the angle. The original slow/fast input rules remain.

## Verification and scope

The final local source suites passed **173 numerical/input checks and 74 current browser checks**. The actual public HTTPS website passed **28 additional checks** in [this GitHub Actions run](https://github.com/beyondgalaxy-maker/pocketfoosball/actions/runs/35813254845), covering fresh desktop, portrait and landscape Chromium profiles, touch neutral reset, Overlay, practice reset, actual origin storage and reload. All runtime assets matched the tested release byte for byte.

[V10-NOTES.md](V10-NOTES.md) records current mechanics, synthetic benchmarks, test changes and limitations. Earlier versioned reports are historical. This is an assisted simulation, not a calibrated real table, complete tournament-rules implementation or verified professional-strength bot. Physical phone hardware and Safari remain untested. Two-player means local/shared-screen, not network multiplayer.

## Build

The repository root is the static website. `python3 build.py` produces standalone `touchline.html` and `site/index.html`. The verification workflow runs v8/v9/v10 focused regressions and `site-v10.py` against the public site using read-only repository permissions. The downloadable source package includes the larger local regression and browser suites.
