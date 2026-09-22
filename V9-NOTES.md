# Touchline 09 — contact spin, saved keys and public release

Version: 9.0.0. Release verification: September 22, 2026.

Public game: https://beyondgalaxy-maker.github.io/pocketfoosball/

## Caught-ball spin

The previous release could retain significant angular velocity when the ball's centre was held against the figure. Merely freezing the drawn pattern would conceal that mismatch without fixing its contact behavior.

Version 9 records actual touching foot/body contacts, adds bounded settling only for a quiet grounded catch, and models a finite contact patch resisting twist under an assisted pin. A moving pin's visible horizontal rotation is integrated from its net constrained centre displacement after positional correction. It therefore stops turning when held still and reverses when rolled the other way.

There is no new proximity-based damping area or attraction. The open-field solver is unchanged: rolling, sliding, backspin and airborne spin remain distinct. Original rod forces and the moving-pin grip are retained. The fixed contact-patch preload and settling thresholds are tuned assistance, not measured properties of a named commercial table.

### Measured regression fixtures

- Front and back pins at both ends, with injected residual twists of -80, +80 and +160 rad/s: all 12 cases settled below 0.01 rad/s within 0.085 s without breaking the pin or moving the centre more than 0.1 mm.
- A settled pin's position, angular velocity and visible quaternion remained stable within 1e-10 over two further seconds.
- A sideways walk and reversal traveled 0.1257339382 m; the surface's integrated rotation represented the same distance to numerical precision. Both pin sides passed.
- Quiet non-latched foot catches settled in mirrored tests without requiring a pin command.
- Open-field skids, backspin, airborne motion and nearby noncontact slow balls exactly matched the previous solver's position/velocity/spin values in the comparison fixtures.
- Pin release retained its off-axis velocity; the rollover fixture still registered a physical striking contact above 2.5 m/s.

These are deterministic test setups, not a claim that every possible real-table contact is reproduced.

## Keybinding editor

Open Menu → Controls → Keyboard · remap keys & sensitivity. Click a key, then press its replacement. The 35 configurable actions include each Mint row's up/down/shoot keys, row selection, fast-slide and soft-pass modifiers, selected-row rotation, pin/release, raise/lower and Coral selection.

Escape cancels capture. Backspace or Delete clears a selected binding. A duplicate key is rejected and its existing action is named. Restore default keys leaves speed and sensitivity settings unchanged. Physical key codes are stored separately from their displayed letter, and on-table key hints follow the saved map.

Bindings are saved in this browser's localStorage, separately from sensitivity. Corrupt or duplicate stored maps fall back to safe defaults. When storage is blocked the controls still work for the current tab, with an explicit message that they were not saved. Keys release on focus loss and when entering binding capture. Touch and mouse retain their existing controls.

## Tests run for this release

| Suite | Passed |
| --- | ---: |
| Base numerical physics | 72/72 |
| Original pointer/stroke intent | 12/12 |
| v6 numerical/input | 16/16 |
| v7 numerical/input | 16/16 |
| v8 rolling/recovery/adaptation | 27/27 |
| New v9 numerical/input | 14/14 |
| **Numerical/input total** | **157/157** |
| Base Chromium browser | 73/73 |
| Additional input browser | 25/25 |
| v6 browser | 78/78 |
| v7 browser | 27/27 |
| v8 browser | 48/48 |
| New v9 browser | 27/27 |
| **Local browser total** | **278/278** |
| **Public-site browser/HTTP checks** | **27/27** |

The local harness used bundled HTML and emulated storage because this editing environment blocks browser navigation to local/public pages. Two older browser assertions had timing races: a camera visibility assertion now waits for the next rendered state, and a projection probe copies its result before the live renderer overwrites shared diagnostics. Neither adjustment changes game behavior or relaxes a physical requirement.

## Actual public-site verification

GitHub Actions run: https://github.com/beyondgalaxy-maker/pocketfoosball/actions/runs/35793042928

Tested runtime commit: d8f542ed51b05c5710100a644c8098d245310958.

At 2026-09-22T22:34:25Z, the test requested the public HTTPS page and all six runtime assets without a login. Each returned HTTP 200, and the asset SHA-256 values matched the checked-out release. Fresh Chromium contexts opened the normal public URL in desktop 1440×900, phone portrait 390×844 and phone landscape 844×390 viewports.

All three profiles loaded version 9, fit their viewport, started the one-second ready interval, preserved the compact menu in Table only mode, saved a new binding into real origin storage, restored it after a full page reload, and moved/released the actual keeper using that binding. Both phone-sized profiles also moved a row through touch events. No uncaught JavaScript errors were recorded.

The downloaded GitHub build's runtime files and standalone HTML were byte-identical to the local tested release. The source package includes the public-site JSON report and screenshots.

## Limits

The phone viewports and touches were emulated; physical Android/iPhone hardware and Safari were not tested. No new full-strength opponent rating or exhaustive elite shooting benchmark is claimed for this release. Prior technique, wall-release and adaptation regressions were rerun, but the older 180-shot precision benchmark was not rerun here. Pins and quiet catches still contain bounded assistance; this is not a fully calibrated table or exhaustive tournament simulation.
