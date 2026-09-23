# Pocket Foosball — Touchline 13

**Play: https://beyondgalaxy-maker.github.io/pocketfoosball/?v=13**

Browser foosball for touch, mouse and keyboard, with Solo, Practice, shared-screen two-player and private Online matches. Refresh old tabs to load **13.0.0**; both online players need the same edition.

## Tap, pass, hold

**Tap a grip or its full-height lane to shoot. Hold it for a firm block. Drag it for manual movement and angle control.** A tap must be short and stay close to its starting position; a hold or a drag does not fire a shot on release. Mouse clicks work too.

Four small optional buttons work on your selected row: **SOFT PASS**, two **TIC** directions and **READY**. The pass makes a softer stroke; a TIC action places the figure beside a nearby slow ball and makes one sideways touch. It does not execute an entire combination. You choose the next touch and finish, and the actual foot must hit the ball. READY returns the ready angle without recentering the rod sideways.

Hold briefly or drag to select a different row without shooting. A fresh manual grip interrupts an assisted stroke. Supported pins stay deliberate: use the existing forward flick for your rollover instead of a tap-generated snake.

Open **Menu → Controls → Your touch layout → Tap, pass, hold** to turn tap shooting or combination buttons off independently. With tap shooting enabled, READY replaces double-tap reset. Turn tap shooting off to restore the old double-tap behavior. Preferences save in this browser without changing your keys or sensitivities.

## Held blocks and two hands

An unheld row has finite passive resistance, not a motor that constantly restores its angle. Gentle contacts usually leave it nearly still; harder impacts can lift the foot. The ball must pass through a real opening in the collidable geometry, never an arbitrary probability of going through a solid figure. Held rows are much firmer, not infinitely rigid. A slow intentional raise stays raised.

Every bot personality at every difficulty now has **two actual hand slots**. Changing rods takes time: 480/340/240/190/160 ms for Easy/Medium/Hard/Expert/Elite. Observation delays remain separate. The unheld rows cannot keep powered targets, fire shots or maintain pins. The same two-powered-handle budget applies to human play, including keyboard and Online. A PIN or brief assisted stroke reserves a hand until released or finished.

Bob, Maya, Theo, Iris and Kai retain their styles. Medium retains basic drives and stick passes rather than the advanced spray/tic-tac repertoire. Higher-level technique sequences still use the contact simulation; these are fictional skill profiles, not measured Elo ratings.

## Screen layout and controls

Overlay buttons and invisible full-height lanes remain optional. Button height, strip position, width, lane reach and shading can be changed under **Your touch layout** and **Display**. The helper bar floats over the game without taking space from the table. Its shaded background follows the transparency setting. The normal on-table handles remain usable.

Keyboard defaults: **Q/A + Z** Keeper, **W/S + X** Defense, **E/D + C** Midfield, **R/F + V** Attack. Shift or Space slides faster; Alt + shot makes a soft pass. All keys are editable under **Controls → Keyboard**. Mouse, touch and keyboard can work together.

Practice retains its always-available **Re-serve** button. Unreachable balls have a visible recovery countdown, and persistent bot-possession failures have a separate last-resort recovery safeguard. There is no universal guarantee against every possible jam.

## Play a friend online

Choose **Menu → Match → Online → Create private room**, copy the invitation and send it to your friend. They open it and press Join. Both press **Ready to play**. First to five wins; both can ready again for a rematch. Both players see themselves at the Mint end.

Keep both tabs open. Menus pause the shared game. A lost connection freezes play; after disconnection, leave and create a new room. GitHub Pages serves the static website, while WebRTC and PeerJS's community service establish the live connection. No game account, camera or microphone is required. Restrictive networks, external service availability and latency can affect connection and play. This is private casual multiplayer, not ranked matchmaking.

## Build and tests

The repository root is the deployable site. `python3 build.py` bundles the code into `touchline.html` and `site/index.html`. Use the HTTPS site for online invitations; the bundled HTML supports offline modes.

Current regression preload: `tests-preload-v13.cjs`. Generate the held-wall fixture report with `node --require ./tests-preload-v13.cjs probe-v13.cjs`, then run the v8 through v13 suites plus `rail-intent-tests.cjs` through that preload. The complete source download also contains the larger mechanics and input suites and the native browser checks.

See **[V13-NOTES.md](V13-NOTES.md)** for measured results, fixture changes and the final public verification run. Earlier edition reports are historical and should not be treated as current benchmarks. Physical phone hardware, Safari and different home/carrier network routes remain unverified. The engine is a tuned, assisted simulation, not a calibrated commercial table or complete tournament-rules implementation.
