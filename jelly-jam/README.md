# Jelly Jam 2 — The Portal Atlas

[Play in your browser](https://beyondgalaxy-maker.github.io/pocketfoosball/jelly-jam/)

Two buddies. Forty stages. One shared life. An original local and online co-op platform/puzzle game, isolated from the existing Pocket Foosball game in this repository.

## Start playing

Collect all three stars and bring both buddies to the rainbow door. A wrong-color hazard, a red beam, or a fall kills the **whole team**. After a short death animation, both restart from the level's beginning. Collected stars, keys, crates, doors, phase switches, crumbling platforms, and dash pickups reset. There are no mid-level checkpoints.

- **Local keyboard:** Peach uses A/D to move, W to jump, S or left Shift to dash. Mint uses left/right arrows, up to jump, down or right Shift to dash.
- **Online:** create a room and send the invite link or eight-character code. Either keyboard layout controls your own buddy. Desktop and mobile players can play together.
- **Touch:** the start-screen Auto / On / Off setting and header toggle choose whether controls appear. Auto checks the primary coarse pointer, rather than showing controls on every desktop. Each buddy has left, right, jump and lightning buttons. Portrait and landscape are supported; landscape gives the largest stage.
- **Solo practice:** Tab switches buddies. Some late simultaneous-timing stages are deliberately built for two people.

Hold jump for height, release for shorter hops. Synchronized jumps while close together give a buddy boost. Dash is unavailable until you touch a lightning crystal. Landing refills it; an airborne crystal can refill it for a second dash. Release before pressing dash again. Dash follows your movement/facing and does **not** make you invincible.

R retries; Escape pauses; Hint provides a nudge, then an optional revealed plan.

## The atlas

The chapter map has forty numbered, named, selectable stages. All are available from the beginning, with difficulty labels, completion marks, best times and medals.

| Chapter | Stages | Focus |
| --- | --- | --- |
| The garden | 1–10 | The original routes, now with shared-death rules |
| Portal orchard | 11–20 | Linked rings, return trips, keys, phase switching and dash |
| Clockwork grove | 21–30 | Crate weights, hold/empty/exactly-one logic, beams, conveyors and crumbling ledges |
| The thorn crown | 31–40 | Precision landings, short timing windows and combined multi-step puzzles |

Earn a seal for each clear and a badge for each fully cleared chapter. Gold requires a zero-death clear under par; silver is a zero-death clear; bronze is a clear. Records are stored on each device. These rewards do not change physics or make an online partner stronger.

## Puzzle language

Portal labels identify their linked pair. Walk into an active ring to warp; jump over it to skip it. Color-marked rings accept only that buddy. Some rings need a key, a phase, or a held flower.

Walk into crates to push them. Crates can stand in for a buddy on a flower. Filled flower rules require holding; hollow rules require leaving empty; split rules require **exactly one** of the listed flowers. Striped dials toggle the shared phase once per entry. Striped platforms show their required phase. Cracked platforms disappear after standing on them. Dashed beam outlines show an inactive beam; solid red is dangerous. The stage's teaching text and Hint button explain its particular rule.

## Tab switching and reconnection

Leaving a tab pauses the team and releases held controls. Returning requests a fresh authoritative snapshot. **Both players press Ready** before continuing; returning does not reset the level.

The host owns the simulation. Inputs carry the level, world revision and death-round revision. Each new connection receives a session epoch, so old channels/packets cannot overwrite a new run. The original guest tab has a session seat token, allowing it to replace a stale channel after a reconnect. Actual channel drops retry automatically with backoff. Back/forward-cache suspension does not destroy the room object.

Keep the host's page open. Closing/reloading the host or an operating-system process kill cannot preserve a serverless live room. Public PeerJS signaling and browser WebRTC are used, without a dedicated TURN relay; strict firewalls, VPNs, network changes or service outages can still prevent connecting. Local/solo play does not need the online service. Room codes/seat tokens are not identity authentication. Rejoin from the original tab where possible.

## Develop and test

No runtime package install or server backend is required.

```sh
python3 -m http.server 8000
# open http://localhost:8000/jelly-jam/

python3 jelly-jam/build.py
node jelly-jam/tests/engine-v2.cjs
python3 -m pip install -r jelly-jam/tests/requirements.txt
python3 -m playwright install --with-deps --only-shell chromium
JELLY_TEST_HTTP=1 python3 jelly-jam/tests/browser-v2.py
JELLY_NETWORK_CLOUD=1 python3 jelly-jam/tests/network-v2.py
```

The builder creates a portable `jelly-jam.html` containing local/solo assets. Online play loads PeerJS only when requested. Active sources are `engine.js`, `campaign.js`, `expansion.js`, `render-v2.js`, `online-v2.js`, `app-v2.js`, `style.css` and `v2.css`. Older v1 modules/tests remain as historical references and are not loaded by the v2 page.

The engine suite includes separate mechanics fixtures, 120,000 seeded simulation steps, and **input-only zero-death solutions for all forty levels**. Browser tests exercise keyboard, short dash taps, the atlas, actual in-game shared death, responsive layouts, and native simultaneous touch dispatch. Network tests use separate browser contexts and real WebRTC; visibility state and BFCache lifecycle events are explicitly simulated in the harness. Emulation is not a physical-phone or every-router compatibility guarantee. CI keeps the actual JSON reports and screenshots.
