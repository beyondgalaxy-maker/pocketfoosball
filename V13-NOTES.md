# Touchline 13 — tap, pass, hold

## Playing

Tap a grip or its full-height lane for a normal shot. Hold it for a firm block; drag to control the rod manually. A short tap must finish within 200 ms and remain within seven CSS pixels of its starting point. Holds, substantial drags, and out-and-back shaking do not become tap shots. These thresholds are tuning choices, not measurements of human ability.

The optional combination bar works on the selected row. SOFT PASS makes a gentle forward stroke. The two TIC buttons reposition the foot beside a nearby slow ball and make one lateral touch, not an entire tic-tac sequence or an aimed goal. READY returns the ready angle without recentering the rod sideways. A new manual grip interrupts an assisted stroke. The ball must still contact the foot: assistance does not assign its position, speed, or goal trajectory.

Use a brief hold or drag to select a different row without firing. A supported PIN still requires the existing forward flick for a rollover; ordinary taps do not become automatic snakes. PIN reserves a hand while active, preserving the previous finger-lift/re-grip behavior. Assisted strokes similarly reserve a hand only while completing their action.

Menu → Controls → Your touch layout → Tap, pass, hold has independent switches for tap shooting and combination buttons. With tap mode on, READY replaces double-tap reset. Turning tap mode off restores the previous double-tap behavior. Preferences save in this browser without resetting custom keys, sensitivity or layout settings. The translucent helper bar does not reserve space or shrink the table.

## Finite resistance instead of permanently held defenders

An unattended motor no longer continually restores the previous angle. Unheld rows have a dissipative brake. The angular resistance magnitude is `0.055 + 0.003 * abs(omega)`, divided by rod inertia to calculate deceleration. Integration removes speed without reversing it. Sliding has its own dissipative resistance. These are tuned SI-scale parameters, not a measured commercial-table calibration.

The collision impulse can lift an unheld figure under a hard impact. A held row uses the existing bounded motor and is much firmer, not infinitely rigid. A slow deliberate raise remains raised until contact or a new command changes it. There is no random chance of a ball passing through a solid figure: the foot must move enough to leave a physical opening. A hard first shot can rebound while lifting the foot, and a subsequent ball can pass under the raised figure.

Controlled fixtures at both ends measured:

| Fixture | Result |
| --- | --- |
| Soft-pass helper | Peak forward ball speed about 1.12 m/s |
| Normal tap shot | Peak forward ball speed about 3.92 m/s |
| Lateral-touch helper | Peak sideways speed about 0.52 m/s |
| 1.5 m/s impact on unheld figure | Peak angular excursion about 2.7 degrees |
| 12 m/s impact on unheld figure | Peak excursion about 120.5 degrees |
| 12 m/s impact on held figure | Peak excursion about 3.9 degrees |

Contact angle, spin, placement and other collisions can change these outcomes. Tests also check an intentionally misaligned tap misses, a lateral touch reaches a second figure, and collision geometry is not disabled to permit a ball past an impact-opened foot.

## Two-hand bot ownership

All five personalities at all five difficulties have two explicit hand slots. Primary ownership follows possession, a recovery attempt, or delayed observation; the second hand can receive a pass or defend. Switching takes 480/340/240/190/160 ms at Easy/Medium/Hard/Expert/Elite. Observation delays and movement limits remain separate. Medium retains basic drives and stick passes, not the advanced spray and tic-tac repertoire.

A transferring hand supplies no active grip until it arrives. Unowned rows cannot retain powered targets, execute a queued strike, or maintain a pin. Pending pins are rearmed only after arrival, fixing a setup failure discovered in the new scheduler. Human, keyboard and online play also have a maximum of two powered grips per team, including PIN and short helper actions.

The 13 existing technique families still made actual forward contacts in the controlled mechanics regression. This is not a professional skill rating, and earlier shooting benchmarks should not be assumed unchanged under the new blocking model.

## Online correction discovered by public testing

An idle remote target still carried the default `ready` grip label. Receiving an old angle could therefore be mistaken for a new local Ready command and temporarily recapture a supposedly released rod. `applyInput` now labels remote targets explicitly. Actual holds and helper-stroke timers acquire their normal hand; idle network packets cannot impersonate one. A new regression verifies the unattended remote row neither moves nor acquires a powered grip.

## Verification

Successful final public run: https://github.com/beyondgalaxy-maker/pocketfoosball/actions/runs/35829466774

Verified commit: `a30e98c904209f9aa5ed6304c40642f863e569e5`.

- 241/241 local numerical/input assertions: 12 input, 72 general mechanics, 27 v8, 14 v9, 16 v10, 19 v11, 26 v12, 3 rail-pressure and 52 v13.
- 200/200 local browser assertions: 127 legacy/manual-mode checks and 73 new tap-mode checks.
- 62/62 public asset/layout assertions and 77/77 public native-input/storage assertions: 139 public website assertions in total.
- 38/38 real two-browser online-session assertions, including guest tap-shot and soft-pass contacts in the host's authoritative world.

The guest's measured peak forward speeds in the public fixtures were approximately 3.921 m/s for the tap shot and 1.123 m/s for the soft pass. The downloaded GitHub build's eleven runtime resources and standalone HTML matched the tested local build byte for byte.

The new bot suite covers every profile/difficulty combination, not just one representative bot. It checks two held rows maximum, transfer gaps, unowned target clearing and absence of direct ball-state changes in the bot update.

Three old mechanics fixtures implicitly assumed always-powered unattended motors. The updated raw pin fixtures explicitly hold the tested rod; the bumper test drives one held rod at a time rather than all eight unheld rods. Original physical assertions remain. The 192-case wall sweep similarly explicitly holds the rod and generates a fresh report: all 192 retain more than 1 cm clearance. Low-speed unheld rods can correctly stop before contact and are not expected to reproduce a motor-driven wall release.

Earlier failed runs remain visible. One omitted the generated wall-fixture report; another exposed the real idle-remote-grip bug. Assertions were not weakened to conceal those failures. Public and local input suites intentionally overlap; these numbers are assertions, not hundreds of independent human play sessions.

## Limits

Local browser pages used Playwright HTML loading because local navigation is restricted in the development environment. Real origin storage, reload and unauthenticated website access were checked separately on GitHub Actions. Online testing used real signaling and WebRTC between independent browser contexts on one test machine, not two distant home/mobile networks.

Physical phones, Safari, varied carrier/home networks and sustained high-latency play remain unverified. The host-authoritative model may favor the host at higher latency. Both players must refresh to v13 before creating a new room. Helper strokes are deliberate playability assistance, not proof that every player will find every combination easy. Pinning, wall recoil and passive brakes remain tuned approximations, not a calibrated table or a complete tournament-rules implementation. Existing dead-ball and persistent-bot-possession recovery safeguards remain; no universal no-stall guarantee is made.
