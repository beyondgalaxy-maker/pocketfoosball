# Jelly Jam

**Small beans. Big teamwork.** An original two-player platformer about Peach and Mint, two little jellies who never leave a buddy behind.

## Play

Open `index.html`, or serve this directory with `python3 -m http.server 8000`. No build, account, API key, or install is needed to play. Run `python3 build.py` for a portable, single-file `jelly-jam.html` edition.

- **One keyboard:** Peach uses A / D to move and W to jump. Mint uses left / right / up arrows. Space also jumps for Peach.
- **Online:** Create a room and share its invite link or eight-character code. Your friend selects Join. The host is Peach and the guest is Mint; either keyboard layout controls your own buddy online.
- **Solo practice:** Tab switches between the two buddies. The other one stays put. Touchscreens have a Switch button and support simultaneous fingers.

Collect all three stars and bring both buddies to the rainbow door. Stand on both flower buttons together to permanently open the gate. Peach uses peach soda and circle platforms; Mint uses mint soda and diamond platforms. Yellow mushrooms bounce automatically. Jump together nearby for a super bounce. Flags save a shared checkpoint. Rescues preserve stars and opened gates. R retries; Escape pauses. Landscape is best on small phones.

## Ten stages

Meet Cute, Better Together, Soda Pop, Mushroom Express, Pick Your Flavor, Cloud Commuters, Prickly Business, Sky High-five, Sherbet Shuffle, and The Big Jam. Every level is open from the start. Best times and fewest rescues are separate records stored in your browser when local storage is available.

## Online architecture and limits

The host runs the fixed-step 60 Hz simulation. The guest sends only directional/jump input. Sequenced, validated authoritative snapshots travel around 30 times per second through a reliable WebRTC data channel. The guest interpolates the display. Inputs expire after 350 ms without updates. Third players are rejected. Both players can pause and retry; the host chooses levels. Hidden tabs pause the game. Keep both game tabs open. Guests can rejoin a still-open room after disconnection, or continue on one keyboard.

The official PeerJS 1.5.5 library loads only when online play is requested, from jsDelivr with unpkg as fallback. Public PeerServer signaling establishes the connection; gameplay uses WebRTC. Local and solo modes work without those services. No camera, microphone, analytics, game account, or paid backend is used.

Some school/work firewalls, VPNs, symmetric NATs, restricted browsers, blockers, or service outages can prevent joining. This release does not provision a dedicated TURN relay and does not guarantee connectivity on every network. Keep room codes private: anyone with a code can take the second seat. Peers and signaling providers may see network metadata; room codes are not identity authentication.

For custom signaling/relay infrastructure, set `window.JELLY_PEER_OPTIONS` before loading `online.js`; it is passed to PeerJS. Never commit permanent TURN credentials. See https://peerjs.com/docs/ for the official documentation.

## Source and tests

`engine.js`: deterministic simulation and levels. `render.js`: original vector artwork. `online.js`: connection lifecycle. `app.js`: inputs, screens, audio, orchestration. `style.css` and `index.html`: responsive interface. Nothing in the existing Pocket Foosball game is replaced.

```sh
node tests/engine.cjs
python3 build.py
python3 -m pip install -r tests/requirements.txt
python3 -m playwright install --with-deps --only-shell chromium
JELLY_TEST_HTTP=1 python3 tests/smoke.py
JELLY_NETWORK_CLOUD=1 python3 tests/network.py
```

The 27 engine checks include input-only completion of all ten levels without teleporting or forced wins, plus isolated mechanics fixtures and seeded randomized inputs. Browser tests check real keyboard input, mobile layout, native two-player multitouch, key release, pause/retry, level selection, solo switching, and invalid-room feedback.

The cloud network test uses the production PeerJS client, public signaling service, independent browser contexts and real WebRTC to check movement, jumping, shared pause, level synchronization, third-player rejection, disconnection, reconnection and local fallback. Without `JELLY_NETWORK_CLOUD=1`, a test-only native WebRTC adapter uses in-process signaling; it is not shipped as a production transport. Restricted sandboxes may block ICE.

GitHub Actions retains actual JSON reports and screenshots. Passing two-context tests cannot guarantee every browser, device, ISP or firewall.
