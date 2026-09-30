# MakeItUploadable

**Website and downloads:** https://beyondgalaxy-maker.github.io/pocketfoosball/makeituploadable/

This project is isolated in this folder. Pocket Foosball's game and releases are unchanged.

The website works in the browser for pictures, PDFs, ZIPs, and supported document previews. Desktop installers add bundled FFmpeg media conversion and simplified Word/text-to-PDF printing.

Mac Apple silicon and Intel installers are built and launched on the corresponding macOS runners. The Windows installer is built and its packaged application launched on a Windows runner. Successful builds must pass sample image, PDF, ZIP, native video-speed and document-printing checks before download links are enabled. A separate workflow checks the public website and all three download endpoints.

**Preview distribution:** Mac builds are ad-hoc signed, not Developer ID signed or Apple notarized. Windows builds are unsigned. Operating-system warnings may appear. Do not disable security protections or force open software reported as damaged or malicious. Launch checks on build runners do not certify Gatekeeper or SmartScreen acceptance.

Only the file families and operations shown in the interface are supported; this is not a converter for every possible file. Review saved copies before submitting important documents. A drawn signature is not a certificate signature. PDF editing can change interactive features; picture-only exports lose searchable text and forms. Keep originals.

Application source: `product/`. Build and live-test evidence: this repository's Actions tab. Dedicated MakeItUploadable prereleases do not replace the game's latest release.
