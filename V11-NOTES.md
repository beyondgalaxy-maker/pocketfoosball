# Touchline 11 — online play, clear controls and sidewall release

Release: 11.0.0, September 23, 2026.

Published game: https://beyondgalaxy-maker.github.io/pocketfoosball/?v=11

Verified runtime commit: `8f9168e4026ddd4cd3f68ad5efb0e987ef3530be`.

Public verification: https://github.com/beyondgalaxy-maker/pocketfoosball/actions/runs/35817463052

## 1. Private online matches

The Online option is under Menu → Match. Create a room, share its invite privately, have the other player press Join, then both press Ready to play. A 10-character code can also be entered. The room is for two players, first to five. Both can request a rematch. No game accounts, camera, microphone, chat, public matchmaking or player directory are added.

GitHub Pages remains the static host. Online mode lazily loads PeerJS 1.5.5 from jsDelivr and uses PeerJS's community signaling and default connection services to establish a WebRTC data channel. Opening the lobby alone does not contact the signaling service; Create or Join does. Ordinary offline modes make no PeerJS requests. The community service is an external dependency, not a GitHub feature or an availability guarantee. Some firewalls and NAT combinations require a working relay. No paid backend, user credentials or API keys were created.

The room uses a cryptographically generated 10-character unambiguous code. Invites place it in the URL fragment. Only share it with the intended opponent; it is an invitation, not identity authentication. Peer connections and external services can observe network addresses. This game is not an anonymity service.

### Simulation and controls

The host is the sole authority for physics, goals and re-serves. The guest transmits bounded rod intentions, not ball positions or scores. Incoming control messages are checked for finite values, rod ownership, array shape, speed limits, sequence and rally epoch. Target angles and lateral travel are bounded. Payloads above 16 KB are rejected, and sends are skipped when the channel's buffered data exceeds 32 KB.

Each player uses the familiar Mint-side controls locally. The guest's ball position, velocity, rod indices, angles, spin vector and quaternion are transformed through a 180-degree rotation. This preserves the rolling direction and maps their four rods to the host's Coral rods. Saved keybindings and touch controls remain local preferences. The usual neutral and PIN actions travel as rod intent.

State and intent are sent approximately 30 times per second. Guest rods have local prediction; the guest ball uses a 45 ms rendering buffer with a maximum 35 ms extrapolation. The guest does not run a separate authoritative ball simulation or award its own goals. This prevents divergent scores but does not eliminate latency or the host's responsiveness advantage. Packet loss, head-of-line blocking and long-distance play have not been exhaustively evaluated. This is casual private play, not a competitive anti-cheat system.

Both players must ready up. The initial shared countdown is 1.5 seconds, with normal readiness between rallies. Opening settings or backgrounding a tab pauses shared play. A heartbeat gap of 1.2 seconds freezes the host rather than allowing unattended goals. A transport disconnect leaves an explicit notice. Leave and create a new room to reconnect: session resumption and host migration are not implemented.

## 2. Almost-transparent overlay

Menu → Display → Overlay buttons keeps the same full-size table as Table only. The dock is placed over the canvas rather than reserving space below it.

The default control background alpha is 0.08, adjustable from 0.03 to 0.30 through Overlay shading and persisted in browser storage. Blur and heavy box shadows have been removed. Labels and faint outlines stay visible; pressing a handle strengthens its fill/outline. PIN uses a distinct armed state. Empty spaces between buttons pass through pointer events.

Midfield and Attack get a 1.20 grid weight compared with 0.88 for Keeper and Defense, approximately 36% more width. The narrow-phone layout uses a similar ratio. All buttons remain at least 44 CSS pixels high in the tested viewports. PIN, score and Practice Re-serve remain available. Shared-screen controls remain mirrored for the opposing player.

## 3. Sidewall squeeze-and-release

The change addresses a ball pressed sideways between a figure and the sidewall, not a new automatic shot command. A fast actual sideways figure contact near the wall can briefly yield the lateral grip. A fraction of the incoming rod velocity is reflected into the rod, after which the existing wall/figure contact solver determines the ball's rebound and spin. No new ball velocity or position is assigned by this extension.

The trigger requires a predominantly sideways foot contact, rod sliding toward the wall above 0.28 m/s, a grounded ball and no established pin. It does not trigger simply because a ball is near a wall. Fast rotational strokes and significant rotation commands bypass the sideways yield, preserving the existing forward/back squeeze shots.

The passive period lasts at most 85 ms and decays lateral speed exponentially. A deliberate pull away, pin request or rotating shot cancels it. The input can subsequently resume pressure; it does not sustain an autonomous oscillator. The model is a tuned grip/bumper compliance approximation, not measured elastic ball deformation.

A second correction gives the first genuinely approaching wall contact one restitution impulse even if that wall contact first appears after solver iteration zero. Previously a foot could push the ball into the wall during a later pass, after the one restitution opportunity had already been missed.

Eight controlled fixtures (both walls, four held foot angles) produced approximately 0.81 m/s peak outward speed and 35 mm of sideways travel. These are fixture measurements, not a guaranteed rebound distance for every shot. Gentle pressure did not trigger the yield. Free stationary balls gained no energy. Existing rotating hard wall squeezes and their limited upward release passed the prior regression checks.

To try it: turn PIN off, put the outer figure beside the ball against the sidewall, push the rod sharply toward that contact, then relax or pull away. A hard shove may create a small sideways release; a sustained clamp can still remain clamped.

## 4. What was actually tested

### Numerical/input checks: 192/192

- Core physics and techniques: 72.
- Input: 12.
- v6 regression: 16.
- v7 regression: 16.
- v8 regression: 27.
- v9 regression: 14.
- v10 regression: 16.
- v11 side-release and network protocol: 19.

All were run with the v11 physics extension installed. The new checks cover mirrored wall fixtures, soft pressure, cancellation, probe worlds containing a subset of rods, reset cleanup, no free-ball energy injection, room parsing, rolling-compatible view transformations, quaternion interpolation and rejection of malformed remote commands. The CI subset reruns v8–v11, 76 checks; the broader suites and dependencies are in the source package.

### Local browser checks: 89/89

Playwright Chromium using the actual bundled game DOM with emulated touch at five screen sizes. Checks include double taps, neutral position, overlay size/opacity, unchanged table scale, minimum button height, widened midfield/attack controls, PIN, practice re-serve, dead-ball and bot-timeout notices, and editable keybindings. Local browser fixtures use injected documents and controlled storage, not a public origin.

### Simulated-latency integration: 16/16

Two actual game instances connected by an in-memory test transport with 18 ms one-way delay. The guest's shooting key caused a physical forward ball contact on the host (about 6.06 m/s in that fixture). PIN, neutral, scoring, pause, rematch and disconnect were checked. This is explicitly not evidence of Internet connectivity.

### Actual public website: 30/30

The GitHub Actions release check fetched all nine deployed runtime files and compared them byte for byte with its checkout. It then opened fresh anonymous Chromium contexts at 390×844, 320×640, 844×390 and 1440×900, tested the overlay and room UI, and verified actual preference persistence through reload. No JavaScript exceptions were recorded.

### Real online match on the public website: 27/27

The same release run opened two independent anonymous browser contexts, used the real Create/Join UI and PeerJS community signaling, and established actual WebRTC data channels. It tested invitation handling, both-ready gating, mirrored guest control, key release, PIN/neutral, ball-view agreement, malformed-input rejection, shared pause, one-time goal authority, rally epochs, victory, rematch, disconnect freezing and return to offline play. No fake Peer object or in-memory network was used in this category.

The two contexts ran on one ordinary CI runner. This verifies the public page, service handshake and real WebRTC transport, not two different households, cellular carriers, every NAT combination, or physical phone hardware. The successful staged-network run before publication was an additional check, not counted again above.

## 5. Remaining limits

Physical Android/iPhone testing, Safari, separate-network relay traversal and sustained high-latency play remain unverified. Keep both pages open during a match. An interrupted room may need to be recreated. Community services may be blocked or unavailable.

Contact pinning and sidewall compliance are assisted/tuned models, not a measured digital twin. The bot skill labels are fictional rather than rated. The complete range of professional foosball techniques and tournament rules is not claimed. Existing offline behavior is retained, but automated fixtures cannot establish that every human will find the controls comfortable.

## References

- GitHub Pages static hosting: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- PeerJS signaling and data connections: https://peerjs.com/client/getting-started
- PeerJS network/relay caveats: https://peerjs.com/client/faq
- WebRTC data channel encryption and buffering: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_data_channels

The runtime and test reports are included in the source archive. `python3 build.py` builds the single-file distribution; use the hosted HTTPS site for online invite links.
