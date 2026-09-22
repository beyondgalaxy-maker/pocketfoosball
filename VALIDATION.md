# Pocket Foosball 8.0.1 — validation report

## Recorded checks

| Suite | Passed / total | Method |
| --- | ---: | --- |
| Core numerical physics | 72 / 72 | Deterministic Node checks |
| Gesture intent / input settings | 12 / 12 | Node |
| Rolling, profiles and full-table regression | 16 / 16 | Node |
| Readiness, precision and wall-contact regression | 16 / 16 | Node |
| New recovery, adaptation, rolling and keeper release | 27 / 27 | Node |
| Browser gameplay regression | 73 / 73 | Chromium injected HTML |
| Keyboard, mouse and viewport layouts | 78 / 78 | Chromium |
| Touch / fullscreen fallback | 25 / 25 | Chromium CDP-emulated touch |
| Readiness and actual audio output | 27 / 27 | Chromium Web Audio analyser |
| New menu, recovery and ball rendering | 48 / 48 | Chromium |

**Totals: 143 numerical/input checks; 251 browser checks.** These are checks, not independent human playtests. Some checks contain multiple fixtures.

## Ball rolling measurements

The pure no-slip test makes one rotation after one circumference of forward, backward, lateral or diagonal travel. The ground-contact-point test covers main, Mint side, Coral side and cross-section camera bases with multiple travel directions. Browser tests additionally check portrait/landscape camera behavior, stationary rendered pixels, true physical radius, and high-speed sampling.

In a real coasting fixture, ground travel is **0.12409364778178224 m** and panel rotation implies **0.1240998526192912 m**. Relative difference: **0.000050001250022659393**, approximately **0.0050%**. This fixture checks integration phase; it is not a global claim of perfect no-slip contact, especially during collisions, skids or assisted pins.

The orientation-timing hook is also tested against an unpatched world: positions and velocities match exactly while the quaternion phase is corrected. Run the focused `node v8-tests.cjs` without preload to exercise that before/after comparison.

## Shooting and recovery fixtures

Elite scores **180/180** first shots in the isolated open-goal benchmark: five profiles, both attacking ends, nine ball positions and two seeds, with opposing figures raised. With three stationary defender layouts, it scores **28/30**. The two unsuccessful defended fixtures are Maya, team 0/right layout and team 1/left layout. These are not moving-human opponents, full-match win rates, Elo ratings or a professional certification.

The new back-rail helper frees **16/16** valid keeper fixtures outside the goal mouth: both teams, Medium and Elite Bob, and four lateral positions. All balls move at least 80 mm into the field; maximum fixture time is **5.8875 seconds**. A center-goal position is intentionally not classified as a solid back-rail jam.

Full-table regression now completes all five 30-second profile fixtures without the previously observed persistent keeper clamp. The recorded total goals for those individual fixtures are Bob 3, Maya 2, Theo 3, Iris 4 and Kai 2. This is a stability check against the built-in opponent, not a style ranking or win-rate study.

## Browser scope and honest limits

Tests use Chromium, mouse/keyboard dispatch and emulated touch, including six existing regression viewport sizes and the new small-screen menu/recovery cases. Native fullscreen rejection, touch cancellation, multiple pointers, paused recovery and absence of an invisible post-reset overlay are checked.

The managed test browser blocks URL navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`. Gameplay tests therefore inject the bundled HTML. The new preference-restoration test uses an explicitly declared storage stub; it does not certify real-origin persistence. Physical Android/iPhone hardware, Safari/WebKit, mobile browser chrome and a hosted end-to-end browser session are **not tested**.

The audio suite samples the actual analyser waveform, silence at volume zero and mute. Short quiet taps are sampled repeatedly so a missed 40 ms envelope under test-runner stalls is not confused with a broken sound system.

## Reproduction

The full source package includes these test scripts and JSON result files. Runtime JavaScript uses no external packages. Numerical tests need Node; browser tests need Python Playwright and Chromium. Build the standalone HTML first:

```sh
python3 build.py
node -r ./tests-preload.cjs tests.cjs
node input-tests.cjs
node -r ./tests-preload.cjs v6-tests.cjs
node -r ./tests-preload.cjs v7-tests.cjs
node v8-tests.cjs
node -r ./tests-preload.cjs precision-benchmark.cjs
python3 browser_tests.py
python3 browser-v6-tests.py
python3 browser-input-extra.py
python3 browser-v7-tests.py
python3 browser-v8-tests.py
```

Run timing-sensitive browser suites sequentially. `tests-preload.cjs` installs the same rolling and keeper-control extensions as the game. The focused rolling suite deliberately installs its own extensions for the before/after comparison.

GitHub Actions runs JavaScript syntax checks, the **27 focused checks**, and the standalone build. It does not run or claim the full local browser suite. All seven uploaded runtime assets matched local Git blob hashes at upload verification. GitHub Pages was still disabled; the verification workflow is not a deployment workflow.
