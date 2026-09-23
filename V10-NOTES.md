# Pocket Foosball — Touchline 10

Version: **10.0.0**. Runtime changes are in `bot-control.js`, loaded after the existing game, input and rolling modules. The older versioned notes describe older releases, not current test counts.

## Controls and the full-size table

Double-tap a handle to return that row's figures to their ready angle. Mouse double-click works too. The rod stays at its present sideways position. The reset releases an armed/held pin and cancels a queued whip, then takes the shortest bounded motor stroke to ready; it does not teleport the figures or rewrite ball velocity. A drag, long hold, cancelled gesture, or simultaneous contacts on two rows is not a double tap. The touch recognizer uses two taps of at most 240 ms, at most 9 pixels travel each, separated by at most 330 ms. Both teams and the original on-table grips are supported.

**Menu → Display → Overlay buttons** keeps the same table scale as Table only while floating the normal four handles and PIN control over its bottom edge. The dock is absolutely positioned and reserves no layout height. Buttons have 48–54 pixel height in the tested layouts. The scoreboard and small menu/restore buttons remain. Local two-player adds a mirrored opposing dock. This mode intentionally covers a small part of the view; it does not make controls invisible or claim zero occlusion. The regular layout and pure Table only remain available. Overlay preference is saved separately from existing keybindings and sensitivities.

Practice has a clearly labeled **Re-serve** button throughout gameplay, including Table only and Overlay. It resets the selected drill even when the ball is reachable. Opening the menu hides in-play utilities. Matches do not have this unrestricted practice reset.

## Pin intent and gentle backwards touches

A supported pin now requires explicit pin intent rather than treating every quiet manual contact as a request to lock the ball under the foot. Normal collision/friction contact still works. In Overlay mode, the old Table-only hold shortcut is suppressed because PIN is available; gentle backwards manipulation therefore remains a free contact unless you arm PIN. Pure Table only retains its hold shortcut because the dock is absent.

A separate near-top setup bug was found during mirrored pin testing. Arming PIN with the foot already very close above the ball could choose a long rotation. It now lowers the remaining small angle when appropriate instead of making a full lap and knocking the ball away. Existing front/back pin, lateral rolling, release and rollover tests pass. Pin support remains bounded assistance, not a measured elastic-ball contact model.

## Re-serve and stalled possession

The previous dead-ball timer required almost zero speed on every physics step. Small numerical contact chatter could repeatedly clear it even when the ball was not going anywhere. V10 adds a quiet-position check: the ball stays within 1.5 mm, near the floor and below 0.03 m/s for at least 1.2 seconds. It must still be outside **every** figure's legal full sliding/rotating reach. Pins, serving, goal transitions and playable resting balls do not qualify. The normal three-second notice then performs an actual re-serve when auto recovery is enabled. Pause freezes the timer; becoming playable cancels it. The automatic recovery setting remains user-controlled.

A ball reachable by a bot but badly handled by it is a different case. After approximately 2.7 seconds without useful progress, the bot abandons the stale setup, lifts and moves beside the ball, lowers behind it, then sweeps/rotates to clear it. This applies to all four rod roles at either end, including the extended toe range; the keeper's earlier back-rail release is retained. These actions use the rod motors and never directly assign ball motion or move the opponent's rods.

If at least two attempts still fail and the same possession has stalled for more than eight seconds, a separate **Bot possession timeout** notice appears. With auto recovery enabled it re-serves to the human after a three-second warning, with the usual one-second readiness period and no awarded goal. With auto recovery disabled it presents a manual restart. Progress cancels the timeout. This final safety net is a deliberate game rule, not a claim that every imaginable jam is solved by realistic contact alone.

## Easier Easy and Medium

All five named styles remain. Medium now selects **Straight drive** or a basic **Stick pass**, with Maya preferring the pass more often. It no longer chooses the spray, brush, snake or tic-tac routines during ordinary Medium play. Straight shots can still emerge angled from actual contact and aiming; the physical simulation does not prohibit angles at lower difficulty. Forced practice demonstrations retain the full move library.

Medium uses a 380 ms visual observation delay, 130 ms decision cadence, 320 ms delay to take a newly selected handle, and limited 70 ms extrapolation of a delayed observation. Its defensive sliding cap is 0.56 m/s. Easy has a 500 ms visual delay, 480 ms handle-transfer delay, 25 ms extrapolation and 0.32 m/s defensive cap. Lower tiers do not command all four handles at once. Recent own-contact feedback is retained instead of pretending a held ball cannot be felt. Defensive target errors are held briefly rather than regenerated every frame. Core Hard/Expert/Elite shot planning has not been weakened by the Medium changes.

These numbers are tuning parameters, not measured human reaction times or Elo ratings. Two synthetic benchmarks are included in `v10-bot-benchmark.json`. Medium scored 26/30 and Elite 30/30 in the narrow raised-defender attack fixtures. A separate 60-shot-per-tier defensive fixture produced goals conceded of Easy 14, Medium 16, Hard 16, Expert 16, Elite 7. That fixture does **not** demonstrate a strictly ordered difficulty curve; row geometry and static coverage contribute heavily. Human playtesting is still needed to judge how forgiving Medium feels.

## Validation

The final local numerical/input suites passed **173/173** checks:

| Suite | Passed |
|---|---:|
| Base contact, pin, moves and gameplay | 72/72 |
| Input intent / auto-ready | 12/12 |
| v6 controls, styles and rolling regressions | 16/16 |
| v7 serve and contact regressions | 16/16 |
| v8 recovery, adaptation and rendering | 27/27 |
| v9 spin and keybinding regressions | 14/14 |
| v10 input, recovery and bot changes | 16/16 |

Three old fixtures were intentionally updated: implicit supported pinning was changed to assert no pin without intent; the mirrored quiet pin explicitly arms PIN; and a manual dead-timer reset fixture also clears the new quiet-position tracker. Their changed expectations are in the source, not omitted from the total.

All 16 new all-row/side bot escape fixtures physically cleared without using the timeout. The older 16 keeper-rail fixtures also passed. A separately immobilized bot produced the expected timeout at about 8.01 seconds after three attempts. The actual browser frame loop, not just a mock timer, showed the dead-ball notice and performed the restart.

The new local browser suite passed **74/74** checks at 320×640, 390×844, 844×390, 1024×768 and 1440×900, including shared-screen controls. It covers real emulated touch streams, mouse double-click, movement not mistaken for tapping, simultaneous grips, explicit pin, practice reset, preserved full-table scale, both restart paths, paused/manual behavior, saved overlay preference, and existing key remapping. Local file navigation is blocked by this environment; these local tests inject the standalone HTML and provide a storage adapter. The public-site workflow separately tests the real HTTPS origin and real browser localStorage.

Public release verification passed **28/28** checks in [GitHub Actions run 35813254845](https://github.com/beyondgalaxy-maker/pocketfoosball/actions/runs/35813254845), using runtime commit `b6f68cda0282d43bbfd5fac6fdb9814c3674646d`. Its report is `site-v10-results.json`. The downloaded GitHub build and all six runtime assets were also compared byte for byte with the local tested release and matched. It fetches every runtime asset anonymously, checks its SHA-256 against the checked-out commit, and opens fresh desktop, portrait-phone and landscape-phone Chromium contexts. Screenshots are retained with the artifact. A successful local test is not substituted for that public check.

Physical iPhone/Android hardware, Safari, accessibility screen-reader use and calibrated real-table measurements remain unverified. No claim of perfect physics, zero possible bugs or championship-level bot strength is made.

## Reproduce

Build the single-file game with `python3 build.py`. Run the included local source suites with:

```sh
for f in tests.cjs input-tests.cjs v6-tests.cjs v7-tests.cjs v8-tests.cjs v9-tests.cjs v10-tests.cjs; do
  node --require ./tests-preload.cjs "$f" || exit 1
done
python3 browser-v10-tests.py
node v10-bot-benchmark.cjs
```

The browser suite requires Python Playwright and Chromium. `site-v10.py` additionally needs outbound HTTPS and the current assets deployed at the public URL. It performs read-only checks and creates no GitHub content, accounts or private data.
