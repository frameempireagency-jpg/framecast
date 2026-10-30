---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: []
---

# FrameCast in the browser: recorder

Scope: the whole browser app at apps/browser (index.html and its scripts): setup, countdown, recording with floating controls, review and trim, library. Mode: Operate.

Audience and job: the Frame Empire team in Chrome or Edge, recording prospect videos, training, problem reports and client handovers when the desktop app is blocked. Task: one minute from link to a saved video.

Constraints: plain HTML, CSS and JS, no build step; GitHub Pages; nothing uploaded; MP4 where the browser writes it, else WebM; honest messages for browser limits (computer sound, click zoom).

## Direction contract

THESIS: One compact card holds the whole setup (what, mic, camera, computer sound, studio frame, who it is for) and one red Start recording; your recordings sit underneath as a grid. Chosen by Andrei on 30 October 2026 after he rejected the "finish the sentence" layout.

OWN-WORLD: FrameCast dark: ground #0e0b12, card #17121e, rows #1f1829 with #2e2340 edges, cream text #efe9f8, lilac #c4a9ec for entered values, purple #8b4fd6 for toggles and focus, red #d63a41 only for recording, green #25d366 for the live mic meter and the privacy dot, amber for browser limits. Geist. Native selects so phones use their own pickers. Raises kept: fixed-width timer figures, new and recovered recordings stay lit until opened, length drawn as a bar, colour always means a state.

STORY: The visitor sees every choice in one card, presses Start recording, gets 3, 2, 1, records with floating controls, then trims, adds a name card if wanted, and saves or shares. On a phone the same card records the camera or polishes a phone screen recording.

FIRST VIEWPORT: Header with icon, FrameCast and "Nothing leaves this computer". A 480px card centred near the top: New recording, five rows, the For field, the full-width red button, the import row. Your recordings below as a four-column grid (two on phones).

FORM: Compact card (option B of four rendered mockups; the earlier roll's assigned "finish the sentence" was built and rejected). seed: none (unavailable)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
