# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Plain HTML, CSS and JavaScript, no framework and no build step (Andrei, 30 October 2026). Hosted free on GitHub Pages from the `framecast` repository, never on Netlify (the Netlify credit budget is shared with every Frame Empire site).

## Users

The Frame Empire team (about six people: callers, closers and Andrei), on their own Windows PCs or Macs, in Chrome or Edge. They use it when the desktop FrameCast app is blocked: a teammate's Windows kept flagging the unsigned installer.

Jobs, all confirmed by Andrei:
- Videos for prospects: a personal walkthrough of a business owner's website preview or our offer, sent to win the sale.
- Training and how-tos: showing callers the CRM, scripts and tools.
- Problem reports: recording something broken to send to Andrei.
- Client handovers: walking a client through their finished site or receptionist setup.

## Product Purpose

The browser version of FrameCast: record the screen, a window or a tab with voice, computer sound and a camera bubble, then trim and save the video, with nothing to install. Success means anyone on the team records and sends a clean video within a minute of opening the link, on a PC where the desktop app was blocked.

## Positioning

Nothing to install, no account, no limits, and nothing leaves the computer. Loom's free plan stops at 25 videos of 5 minutes at 720p; Screenity needs a browser extension; Screen Studio is Mac-only and paid; Cap needs its own server to share. FrameCast in the browser runs from a link, records for as long as the computer allows, keeps every video on the person's own machine, and survives a crash mid-recording.

## Operating Context

- Opened from a link in Chrome or Edge; can be installed as an app from the browser, which Windows does not flag.
- Recordings are downloaded or saved to a folder the person picks, then sent by Telegram, WhatsApp or email by hand. There is no FrameCast server (framecast.frameempire.co.uk has no DNS record).
- Video for prospects is watched on phones as often as on computers, so exports must play everywhere (MP4 where the browser can write it).

## Capabilities and Constraints

Confirmed by Andrei:
- Record screen, window or tab through the browser's own picker.
- Microphone and computer sound. Computer sound is a browser limit: Chrome and Edge give it on Windows for a screen or tab, on a Mac only for a tab.
- Camera bubble in a corner of the video.
- Countdown, pause and resume, and trimming the start and end.
- Recordings stay on the person's computer, like Studio mode in the desktop app.

Proposed by Claude to go past the competition (Andrei asked for ideas; these are proposals until he sees them):
- Floating controls that stay on top of other apps while recording (timer, pause, stop), using the browser's picture-in-picture window.
- Crash-proof recording: the video is written to the computer every second, so a closed tab or crash does not lose it.
- A "studio look": the screen framed on the brand background with padding, rounded corners and a shadow, the polished look Screen Studio charges for.
- Prospect mode: a name card for the business owner at the start and a Frame Empire end card, and the file named after the prospect.
- Private notes or a script beside the controls that the viewer never sees.
- A library of past recordings kept in the browser.

Browser limits that cannot be designed away: a web page cannot see clicks in other apps, so Screen Studio-style click zoom is not possible without an extension; computer sound depends on the browser and system.

## Brand Commitments

- Name FrameCast, tagline "Record. Share. Move on."
- The app icon from `docs/design/2026-10-23-framecast-icon` (cream F, green play button, lilac chevrons on the purple gradient tile).
- Brand colours as in the desktop app: purple #521F88 (lifted to #8B4FD6 on dark surfaces), near-black #0C0A0C, green #25D366 for success, cream #EFE9F8, lilac #C4A9EC. Red stays the colour of recording.
- FrameCast's own sounds for start, stop, screenshot and notification (`apps/desktop/src-tauri/sounds`).
- No em dashes anywhere in copy. British English. Plain words for non-technical people.

## Evidence on Hand

No user testimonials, usage figures or customer names exist for FrameCast; do not invent any.

## Product Principles

- One minute from link to sent video. Every extra step is a cost.
- The person's video is theirs: nothing is uploaded, tracked or stored anywhere but their own machine.
- Never lose a recording.
- Say plainly what the browser cannot do instead of failing silently.

## Accessibility & Inclusion

Keyboard operable throughout, visible focus, WCAG AA contrast, and respect for reduced motion. The team includes non-native English speakers, so labels stay short and literal.
