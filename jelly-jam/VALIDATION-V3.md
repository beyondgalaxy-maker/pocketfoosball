# Wind & Light validation

## Locally completed

- 108 engine checks passed, including all 60 stages completed with ordinary player inputs and zero deaths; 180,000 seeded simulation steps stayed finite.
- 40 Chromium browser checks passed, with no page exceptions. Includes 390px portrait and 844px landscape native simultaneous touch, real mirror interaction, six chapter tabs, sixty selectable stages, teaching text, camera toggle, fan lift, team death and pause/restore UI.
- JavaScript syntax checks and the portable HTML build passed.

## Release gates

Public PeerJS/WebRTC and deployed-site checks must pass in GitHub Actions before reporting a verified online release. The local restricted environment could not establish its adapted-signaling WebRTC connection; this is not counted as a successful network test.

## Scope

Visibility and BFCache events are explicitly simulated, while player input and peer data channels are real. Mobile tests are browser emulation, not physical phones. Host process termination/reload and all possible router/firewall configurations are not covered. No claim that this update is flawless or that every network connects.
