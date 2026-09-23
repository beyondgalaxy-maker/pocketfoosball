# Pocket Foosball / Touchline 12

Release date: September 23, 2026. Version: 12.0.0.

Public game: https://beyondgalaxy-maker.github.io/pocketfoosball/?v=12

## Controls that reach above the buttons

In Solo, Practice and Online, enable Overlay buttons. By default each of the four bottom grips has an invisible lane that extends to the top of the game area. Start a drag inside a lane and that finger owns the selected row until release, including when it crosses into another lane. This uses the existing pointer capture and two-rods-per-player limit. There is no full-screen DOM button or new opaque panel. The small physical on-table handles keep priority at their actual locations, and the menu, PIN, score and practice reset remain usable.

Open **Menu → Controls → Your touch layout**. The main settings are full-height / bottom-half / buttons-only reach and button height. Expand **Position & spacing** to change strip width, height above the bottom edge and the extra width given to Midfield and Attack. A preview shows the arrangement. Show touch lanes provides a temporary visual guide; it is off by default. Try layout immediately returns to the full-size table with the overlay on.

Layout settings save in this browser independently of keybindings, input sensitivity and the existing overlay-opacity setting. Reset layout does not reset keyboard keys. Blocked local storage falls back to the current tab and displays a notice. Minimum control sizes are retained, so very narrow phones may reach their minimum usable strip width before a requested percentage is achieved. Rotation recomputes the lane geometry. The game table does not shrink when these controls change.

Shared-screen two-player retains its opposing controls rather than granting one player full-height lanes. Online is different: each participant has their own screen and their own full-height layout. Layout settings are not transmitted to the other player. Completely bare Table only mode still uses the original on-table handles; use Overlay buttons for the extended lanes.

## A deliberate fast forward finish

Ordinary dragging still maps distance to rod angle. Slow movement is not turned into a charged or accelerating shot. A separate intent detector recognizes a long, consistent, extremely fast forward stroke: at least 64 CSS pixels, at least 1.4 pixels/ms within a recent 100 ms window, with a predominantly forward rather than lateral direction. It rejects short twitches, back-and-forth shaking, backwards swipes, stale samples and sliding-dominant diagonal gestures. Each touch can trigger at most one finishing stroke. Coalesced pointer events are processed when supplied by the browser.

After the threshold is crossed, the rod accelerates under its existing finite motor/inertia model toward the next forward kick-through angle. It starts at the actual current angle, not a manufactured backswing. A foot already over a front-pinned ball goes forward up and around into the next strike; an already wound-back figure can finish the ordinary forward kick. Faster qualifying swipes request greater motor strength within the existing cap. The gesture never assigns the ball a position, speed or shot direction: the foot must actually make contact.

The previous pointer-movement shortcut that called the automatic pinned-snake routine is bypassed. Small motion while explicitly pinned remains tolerant of wobble; a deliberate slower rotation releases the pin and resumes manual rotation instead of calling a rollover macro. A long hold alone no longer silently arms a pin. Use the visible PIN button or the remappable pin key. Keyboard shot commands and bot technique sequences retain their existing behavior.

Mint forward is left in landscape and up in portrait. Online players both use their own Mint-side view. To attempt a manual snake: establish a front pin with PIN, move sideways gently, then make a decisive forward flick. A brief FORWARD FLICK cue confirms recognition, not a guaranteed ball contact. Turn off Fast-swipe finish to retain only manual distance-to-angle movement.

Slow raises stay raised. Immediate release after a fast finish can auto-ready when auto-ready is enabled. Holding after the stroke preserves the chosen final angle. Double-tap neutral, keyboard remapping and mouse/keyboard mixing remain available. The finishing assist is a touchscreen playability choice, not enforcement of tournament spinning rules.

## A wall rebound that remains free

The previous side-contact treatment could produce a small outward bounce, then restore the old inward rod target and trap the ball again. The new treatment keeps the compliant side-contact interval slightly longer and consumes that old inward preload after the recoil. A fresh finger movement supplies a new target. The existing contact reaction still supplies the ball's rebound; there is no arbitrary sideways velocity, teleport, random hop or automatic release of a stationary loose ball.

A repeated online packet containing the same old target is not treated as a fresh inward movement. The host remembers the consumed target until a genuinely changed target, different rotation, pin or new rally supersedes it. This prevents network retransmission from restoring the clamp. Actual new hand motion still works.

The treatment requires actual low-foot side contact near a wall, appreciable inward lateral rod velocity and no supported pin. Merely pressing a resting figure against the rail does not pump energy indefinitely. Rotating forward/backward squeezes are detected separately and keep their existing contact response. In an early regression the longer interval interfered with those squeezes; that was corrected and the full squeeze suite rerun.

For the sideways release, use PIN off, place the outside figure alongside the ball, give a quick sideways tap toward the rail, then relax or move away. Keeping an active pin deliberately keeps the pin behavior. These are tuned compliant rigid-body contacts, not measured ball, bumper and table deformation.

## Validation

The final local runtime passed **221 numerical/input assertions**: 72 base physics checks, 12 original input checks, 16 v6 checks, 16 v7 checks, 27 v8 checks, 14 v9 checks, 16 v10 checks, 19 v11 checks, 26 new v12 checks and 3 repeated-network-preload checks. The source package includes the suites and JSON results; the focused suites also execute in GitHub Actions.

The final local browser suite passed **127 checks** across 390×844, 320×568, 844×390, 768×1024 and 1440×900 viewports. These cover all four upper-screen lanes, capture across lane boundaries, independent touches, pointer cancellation, unchanged table scale, the layout settings, slow raises, real pin contact, deliberate flicks, toggle-off behavior, double-tap neutral and re-gripping. Fast-touch streams are emulated with high-frequency event timestamps; these are not physical-phone measurements. Local storage checks using injected content are supplemented by the deployed-site script's real origin reloads.

The wall fixture sweep tests eight rods, two sidewalls, four foot angles and three initial rod velocities: **192 cases**. In the old implementation all 192 showed some brief outward travel but none remained more than 10 mm free after one second. In the revised implementation all 192 remained more than 10 mm free, with a minimum measured clearance of **46.04 mm**. There was one contact-release event per fixture. These are controlled synthetic fixtures, not a claim about every possible table state. Another eight mirrored fixtures replayed unchanged input packets at 30 Hz using the real protocol encode/apply functions; all remained free. Fresh input and rally reset were tested separately.

Public deployment and real WebRTC verification results are recorded with the release artifact. Verification compares every hosted runtime asset with the repository bytes, opens the public game without login, uses upper-screen touches, reloads saved layout preferences and plays a two-context online session. That session checks host and guest lane acquisition, a guest forward flick reaching and rotating the authoritative host rod, independent layouts, scoring, pause/resume, rematch and transport disconnect. Local gesture contact tests independently confirm an actual forward ball strike at both ends rather than merely displaying a move label.

## Published build verification

The final public release is commit `8c112983ad85d9b5b6fbc34beb52b889473702c4`, checked on September 23, 2026. The successful verification run is https://github.com/beyondgalaxy-maker/pocketfoosball/actions/runs/35821649749 (second attempt). Its **62/62 anonymous public-site checks** and **36/36 real online-session checks** passed. The site checks cover portrait, small-phone, landscape and desktop viewports, all four upper-screen lanes, real-origin persistence across reloads, usable menus, transparent grips, score/PIN/reset availability and unchanged table scale. No JavaScript exceptions were recorded in the online run.

The online session ran on the public HTTPS site with real PeerJS signaling and WebRTC. A real emulated guest touch acquired the correct host-side rod, moved it, released it and executed the deliberate forward finish. The host received rod intent; it did not accept guest-assigned ball positions or scoring. The same session checked scoring, pause/resume, rematch and disconnect behavior. These 36 checks are one controlled two-browser session, not 36 independent matches.

The first public-site attempt timed out waiting for the final `v12.js` while GitHub Pages deployment was still queued. It was not counted as a pass. After deployment succeeded, the unchanged verification run was retried successfully. The resulting artifact was downloaded and all ten runtime assets, the builder and standalone HTML were compared against the final local files: all twelve matched byte for byte. The HTML SHA-256 is `a6312258085a7a27161fb55e148503e91b941d3f3a043fe2db775ae6628c2fb1`.

## Limits

Physical iPhone/Android hardware, Safari and arbitrary carrier/home-network combinations remain unverified. The real WebRTC checks use independent browser contexts on one CI runner, not two distant networks. PeerJS community signaling/connection services remain external to GitHub Pages; availability, NAT traversal and latency are not guaranteed. The host retains the authority and responsiveness advantages already described in v11. Both participants must refresh to v12 before creating a new room.

Pin support and wall compliance remain bounded playability assistance. No claim of perfect real-table physics, official Elo, every professional move or championship-level skill is made. Bot tuning and the repertoire were not expanded in this update.

## Reproduce

`python3 build.py` creates the standalone HTML. The repository root remains the static Pages site. The offline distribution embeds the runtime; online connection code loads PeerJS only when requested.

Run `node probe-v12.cjs` before `node v12-tests.cjs`, then `node rail-intent-tests.cjs`. For the full local regression package, run the other suites with `node -r ./tests-preload-v12.cjs <suite>.cjs`. With Playwright and Chromium installed, `python3 browser-v12.py` runs the local touch suite. `site-v12.py` checks the deployed public origin, and `network-v12.py` exercises real signaling/WebRTC against `GAME_URL` or a local static server.

The guarded upgrade script was used to prepare the narrow bridge into the original input handler and commit tested generated files. It does not rewrite code at runtime. The normal verification workflow uses read-only repository permissions; the separate activation workflow was explicitly scoped to publishing the tested release.
