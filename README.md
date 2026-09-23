# Pocket Foosball — Touchline 11

**Play: https://beyondgalaxy-maker.github.io/pocketfoosball/?v=11**

A browser foosball game for touch, mouse and keyboard. Version **11.0.0** adds private online matches, a nearly transparent overlay, and sideways wall releases. Reload an old tab to get Touchline 11. No player account or installation is needed.

## Play a friend online

Open **Menu → Match → Online**, then **Create private room**. Copy the invite and send it privately to your opponent. Your friend opens the link and presses **Join**; a room code also works. Both press **Ready to play**. The first player to five wins, and both can ready up for a rematch.

Both players see themselves at the Mint end, using their own familiar touch, mouse or saved keyboard controls. The host computes the ball and goals; the guest sends bounded rod controls. The game mirrors the guest's view rather than requiring backwards controls. A connection badge shows round-trip latency.

Keep both tabs open. Opening a menu pauses the shared simulation. A lost connection freezes play rather than giving away goals. After an actual disconnect, leave and create another room; there is no host migration or automatic session reconnection.

GitHub Pages hosts the static game, not a multiplayer server. Online mode loads PeerJS 1.5.5 and uses its community signaling/connection services with WebRTC data channels. No camera or microphone is requested. Offline modes do not load that library. This is casual private multiplayer, not ranked matchmaking; external service availability, restrictive networks and latency still matter. See [V11-NOTES.md](V11-NOTES.md) for the architecture, tests and limits.

## Clearer overlay, same full-size table

Under **Menu → Display**, enable **Overlay buttons**. The background is only **8% opaque** by default, with no blur covering the table. **Overlay shading** adjusts it from 3% to 30%; the preference saves in this browser. Outlines and labels remain visible, and the pressed control becomes clearer.

Midfield and Attack grips are approximately 36% wider than Keeper and Defense. Controls remain at least 44 CSS pixels high in the tested layouts. The overlay does not reserve layout space: table scale is identical to Table only. PIN, the score and the Practice Re-serve button remain accessible.

## Sideways wall release

With PIN off, bring the edge figure beside a ball against the sidewall. Give the rod a sharp sideways push into that contact, then relax or pull away. The brief yielding grip and a correctly timed wall collision can produce a small sideways rebound. Simply holding pressure does not create perpetual bouncing.

This is a tuned grip/bumper-compliance approximation, not measured ball deformation. It does not directly assign a new ball velocity. Gentle pressure, free rolling and rotating forward/back wall shots retain their separate behavior.

## Existing controls and modes

Double-tap a handle or double-click with a mouse to return that row's figures to their ready angle without recentering the rod sideways. Slow raises stay raised; a fast whip followed by release can auto-ready.

Keyboard defaults: **Q/A + Z** Keeper, **W/S + X** Defense, **E/D + C** Midfield, **R/F + V** Attack. Shift or Space slides faster; Alt + shot makes a soft pass. These keys and sensitivity settings are editable under **Menu → Controls → Keyboard · remap keys & sensitivity**. Keyboard, mouse and touch work together.

Solo still has five personalities at five difficulty levels, including the reduced Medium repertoire and handle-switch delay. Practice keeps an always-available Re-serve button. Shared-screen two-player is separate from Online. Unreachable balls use a visible countdown; persistent bot possession failures have a separate recovery safeguard.

## Verification and building

The root files are the published website. `python3 build.py` produces a standalone `touchline.html` and `site/index.html`. Solo, Practice and shared-screen play work offline in that file; use the HTTPS website for online rooms and working share links.

Run the numerical suites through `.github/workflows/verify-upload.yml`. `site-v11.py` checks the actual deployed files and phone layouts without a login. `network-v11.py` creates a real PeerJS room and plays through a real WebRTC connection; set `GAME_URL` to choose the public site rather than a local CI server.

The successful public release run is https://github.com/beyondgalaxy-maker/pocketfoosball/actions/runs/35817463052. It passed **30 public-site checks and 27 real online-session checks**. The complete downloadable source package also includes the broader **192 numerical/input checks, 89 local browser checks and 16 simulated-latency integration checks**. These categories are distinct, not independent human play sessions.

Two browser contexts on one CI runner are not a test of separate home/mobile networks. Physical Android/iPhone hardware, Safari, all carrier NATs and sustained high-latency play remain unverified. The physics remains an assisted simulation, not a calibrated real table or a complete tournament rules engine.
