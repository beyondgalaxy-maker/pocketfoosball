# Jelly Jam 3 — Wind & Light

An original local/online two-player puzzle platformer starring Peach and Mint. **60 authored stages, six chapter maps, one shared life.**

[Play on GitHub Pages](https://beyondgalaxy-maker.github.io/pocketfoosball/jelly-jam/)

## Start playing

Open `index.html` or serve this folder with `python3 -m http.server 8000`. Run `python3 build.py` to produce the self-contained `jelly-jam.html` for offline local/solo play. Online mode loads pinned PeerJS 1.5.5 only when requested.

- Peach: **A / D** move, **W** jump, **S** dash, **E** interact.
- Mint: **left / right arrows** move, **up** jump, **down** dash, **Enter** interact.
- Online, either keyboard layout controls your own buddy. Host creates a room; guest enters the code or follows the invite URL. Both must refresh to v3 before creating a room.
- Touch: **Auto / On / Off** on the home screen and header. Mobile layouts offer independent multi-touch; jump, dash and nearby interaction buttons. Unneeded interaction/dash buttons are hidden on early stages. Landscape offers a larger view. Desktop and phone players can share an online room.
- **Tab** switches buddy in solo practice; **R** retries; **Escape** pauses. The map is available before playing and during a run. All stages are selectable. The camera button switches between adaptive framing and whole-room overview on larger stages.

## Chapters and puzzles

1. **The Garden (1–10):** movement, color-safe soda, spring mushrooms, clouds, cooperative switches.
2. **Portal Orchard (11–20):** linked/color/conditional portals, keys, dash crystals and shared phases.
3. **Clockwork Grove (21–30):** crate weights, hold/empty/exactly-one logic, timed beams and crumbling ledges.
4. **The Thorn Crown (31–40):** tighter maneuvers and combined puzzle challenges.
5. **Wind & Light (41–50):** fans, mirrored light, crate shadows, stored sunshine, heavy weights, darkness circuits and relay puzzles.
6. **The Observatory (51–60):** rune sequences, backtracking, reusable crate mechanisms, vertical and scrolling stages, and multi-room optical puzzles.

Every stage has a field guide explaining its actual mechanics and controls. New mechanics debut in simpler teaching stages before being combined. The **Hint** button provides a nudge; a separate solution button is available. Previously introduced mechanics remain explained when a player skips directly to a later stage.

### New machinery

**Fans** lift a buddy inside their striped field while powered; drift sideways to land. **Mirrors** rotate once per interaction press when nearby. Harmless golden light reflects at right angles into labeled receivers; red timed beams remain dangerous. Solid walls, closed doors and crates block light; buddies and thin one-way ledges do not. A ringed **memory receiver** stores power after charging, freeing the beam for another task. Hollow **darkness receivers** are active when unlit. A plate marked **2** needs a heavy crate or two buddies. **Levers** stay switched. **Rune pads** require the printed order; a wrong entry resets only the sequence, and there is no timer.

These mechanics are used in puzzles such as reusing one crate first as a fan weight and later to clear a light beam, powering a fan so the helper can collect a permanent bypass key, and charging one receiver before redirecting the beam to another.

### One team, one life

Either buddy's death freezes both, then restarts the entire stage. Stars, keys, gates, crates, phases, mirrors, receivers, runes, levers and pickups reset. No checkpoints. Falling below the world kills the team; in the scrolling storm stage, getting left behind does too. The storm waits for both buddies to cross its start line.

### Presentation and replay

Adaptive cameras, authored zoomed-out room views, mini-maps, labeled rooms and a six-chapter atlas make larger puzzles navigable. Squash/stretch, animated legs, landing bursts, fan blades, light pulses, mirror glints and particles provide feedback. Reduced-motion preferences limit decorative animation. Best times, completion seals and chapter badges are saved in browser storage. Original 40-stage v2 completion records are preserved.

## Online recovery and limits

The host owns the game simulation. Guests send input and requests; snapshots include all puzzle state. Tab absence pauses both players and clears held input. Returning players synchronize then both press **I'm ready**. Temporary data-channel drops retry; seat tokens, connection epochs and world/round revisions reject stale traffic. A guest can rejoin while the host keeps the same page open.

This is direct WebRTC with public PeerJS signaling, not a persistent hosted server. There is no paid service, TURN relay, identity login or host migration. Restrictive networks, VPNs or signaling outages can block connections. **Closing/reloading the host page or its browser process loses the live room.** A mobile operating system may discard a background page; do not treat tab suspension as durable server storage. Local and solo modes do not depend on signaling.

## Development and tests

No build framework or runtime packages are required. Tests use Node and pinned Python Playwright (see `tests/requirements.txt`).

```sh
python3 build.py
node tests/engine-v3.cjs
python3 -m pip install -r tests/requirements.txt
python3 -m playwright install --with-deps --only-shell chromium
JELLY_TEST_HTTP=1 python3 tests/browser-v3.py
JELLY_NETWORK_CLOUD=1 python3 tests/network-v3.py
```

The engine suite includes normal-input, zero-death solutions for all 60 stages, independent rule/physics checks, and 180,000 seeded simulation steps. Browser tests cover the map, teachings, touch controls, mirror interaction, cameras and shared resets. The real online suite covers public signaling, native WebRTC, mobile guest input, portal/key teamwork, mirror/memory synchronization, tab return and reconnection. Visibility/BFCache events are explicitly simulated; mobile tests use browser touch emulation, not physical-device certification. Automated solution coverage demonstrates solvability, not universal difficulty or freedom from every possible bug.

The two Jelly Jam workflows verify exact source hashes, test branch builds, and verify the actual deployed GitHub Pages assets plus browser/online behavior after release. See `VALIDATION-V3.md` and Actions artifacts for recorded results. Existing v2 source files are retained for reference/regression; the current page loads the v3 engine, renderer, network and application.
