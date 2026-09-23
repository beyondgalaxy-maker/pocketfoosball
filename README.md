# Pocket Foosball — Touchline 12

**Play: https://beyondgalaxy-maker.github.io/pocketfoosball/?v=12**

Touchscreen, mouse and keyboard foosball with private online matches. Refresh an old tab to get **12.0.0**. Both online players need v12 before creating a new room. No player account or installation is needed.

## Small grips, full-height control

Enable **Menu → Display → Overlay buttons**. In Solo, Practice and Online, each grip's invisible lane now reaches to the top of the game area. Start anywhere in that lane; the row remains yours until you lift your finger, even if you cross another lane. The actual on-table handles and menu/PIN/reset buttons remain usable. The table does not shrink.

Open **Menu → Controls → Your touch layout** for:

- **Where grips respond:** full height, bottom half, or buttons and table handles only.
- **Button height:** 44–84 CSS pixels.
- **Position & spacing:** strip width, lift above the bottom edge, and extra Midfield/Attack width.

The preview updates as you change settings. **Show touch lanes** makes the invisible boundaries visible; it is off by default. **Try layout** resumes with Overlay buttons on. **Reset layout** preserves keybindings and sensitivity. Settings save in that browser, independently for each online participant. Narrow screens retain a minimum usable control size. The existing overlay-shading slider still controls transparency.

Completely bare Table only mode retains normal on-table grips. Shared-screen two-player keeps its opposite-side controls instead of allowing one player to take the entire screen.

## Deliberate forward flicks, not an automatic pinned-snake shortcut

Slow dragging remains manual distance-to-angle control. A sufficiently long, very fast, consistently forward swipe requests one accelerated finishing stroke from the figure's actual angle. It does not manufacture a reverse backswing or assign the ball a shot trajectory. A foot over a front-pinned ball rolls forward around the rod; an already wound-back foot can finish a shorter direct kick.

Forward is **left in landscape** and **up in portrait**, from each online player's own Mint-side view. To attempt a snake, establish a front pin with **PIN**, slide gently sideways, then make a decisive forward flick. The **FORWARD FLICK** cue means the gesture was recognized, not that contact or a goal is guaranteed.

Small twitches, backward swipes, shaking and mostly sideways motion do not arm this finish. A slower deliberate rotation releases a pin into manual control instead of calling the old automatic rollover. Holding a handle alone does not silently pin: use PIN or its custom key. **Fast-swipe finish** can be switched off in Your touch layout. Slow raises stay raised; auto-ready applies to an immediate release after a fast stroke, not a deliberate hold afterward. Keyboard shot commands and bot technique sequences retain their existing behavior.

## Sidewall rebound without immediate re-clamping

With PIN off, bring the outer figure beside a ball at the rail, give a quick lateral tap into the contact, then relax or move away. The rod's brief compliant recoil no longer restores the old inward pressure immediately afterward. New hand motion is still accepted, while repeated unchanged network packets cannot restore the consumed preload.

This changes the grip/contact response, not the ball's state. It does not add random hops or launch stationary balls, and rotating forward/backward squeeze shots retain their separate response. The model is tuned assistance, not measured ball or bumper deformation.

## Play a friend online

Open **Menu → Match → Online → Create private room**, copy the invite and send it privately. The other player opens it, presses **Join**, and both press **Ready to play**. First to five wins; both can ready again for a rematch.

Both players use their own familiar Mint-side view and controls. The host computes physics and scoring; the guest sends bounded rod intent. Keep both tabs open. Opening settings pauses the match. A lost connection freezes play; after a disconnect, leave and create a new room.

GitHub Pages hosts the files; online mode uses PeerJS community connection services and WebRTC. There is no camera/microphone request. Private rooms are not ranked matchmaking, and service availability, restrictive networks, latency and host responsiveness advantages remain relevant.

## Existing controls and modes

Double-tap a grip or double-click it with a mouse to return that row to its ready angle without recentering sideways. Default keyboard rows are **Q/A + Z**, **W/S + X**, **E/D + C**, and **R/F + V**. Shift or Space slides faster; Alt plus a shot makes a soft pass. All row keys and related controls are editable under **Menu → Controls → Keyboard · remap keys & sensitivity**.

Solo retains five personalities and five difficulty settings, including Medium's basic repertoire and handle-switch delay. Practice always shows Re-serve during play. Unreachable balls have an announced recovery countdown, and persistent bot possession failures have a separate timeout safeguard. Bot skill was not expanded in v12.

## Build and verify

The repository root is the static website. `python3 build.py` embeds the game into `touchline.html` and `site/index.html`. Use the public HTTPS website for online invites.

Run `node probe-v12.cjs`, `node v12-tests.cjs`, and `node rail-intent-tests.cjs`. The repository's verification workflow also runs the earlier v8–v11 suites with the final v12 physics installed. The full source download contains older baseline suites and `tests-preload-v12.cjs`; use `node -r ./tests-preload-v12.cjs <suite>.cjs` to run those against the current runtime. With Playwright/Chromium installed, `browser-v12.py` exercises local touch behavior; `site-v12.py` checks the actual deployed files and origin storage; `network-v12.py` connects two real WebRTC browser contexts. Set `GAME_URL` for the latter to use the public website.

The final local build passed **221 numerical/input assertions** and **127 browser checks**. The controlled sidewall sweep left the ball free in **192/192 cases**, with a minimum clearance of 46.04 mm after one second. Eight additional fixtures verified unchanged network input could not re-clamp it. These are fixtures, not a claim about every possible ball state. See [V12-NOTES.md](V12-NOTES.md) for detailed results and limitations.

The published build also passed **62 anonymous public-site checks and 36 real online-session checks** in https://github.com/beyondgalaxy-maker/pocketfoosball/actions/runs/35821649749. Its downloaded artifact matched the tested local runtime byte for byte.

Physical phones, Safari and different home/carrier networks remain unverified. Online browser tests use two contexts on one runner. The game remains an assisted simulation, not calibrated real-table physics, an officially rated opponent or a full tournament-rules implementation.
