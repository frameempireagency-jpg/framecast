# FrameCast: attribution and notice of changes

FrameCast is published by **Frame Empire Ltd**, a company registered in England and Wales, company number 16163944.

## What this software is based on

FrameCast is a modified version of **Cap**, an open source screen recorder published by Cap Software, Inc.

- Upstream project: https://github.com/CapSoftware/Cap
- Upstream licence: **GNU Affero General Public License, version 3 (AGPL-3.0)**, except for the `cap-camera*` and `scap-*` crate families, which are MIT licensed

Cap's copyright is retained by its authors. FrameCast is not affiliated with, endorsed by, or supported by Cap Software, Inc. Do not contact Cap for support with FrameCast.

## Your rights under the AGPL

Because FrameCast is derived from AGPL-3.0 licensed software, **you are entitled to the complete corresponding source code** of this modified version, under the same licence. That applies whether you received the application itself or you interacted with it over a network.

The source is published at:

> **https://framecast.frameempire.co.uk/source**

The full licence text is included alongside this file as `LICENSE`, and is also available at https://www.gnu.org/licenses/agpl-3.0.txt

You may use, study, modify and redistribute this software under the terms of the AGPL-3.0. You do not need Frame Empire's permission to do so.

## Notice of changes

The following changes have been made to the upstream Cap project. This list is maintained so that it stays accurate. If you change something that a user would notice, add it here in the same release.

| Change | Area |
|---|---|
| Renamed the application from Cap to FrameCast throughout the user interface | Branding |
| Replaced the application icon with a Frame Empire icon | Branding |
| Rewrote the macOS camera, microphone and screen recording permission strings | Branding |
| Changed the bundle identifier to `uk.co.frameempire.framecast` | Packaging |
| Renamed the recording document type display name to "FrameCast Recording" | Branding |
| Registered the `framecast://` URL scheme in place of the upstream scheme | Integration |
| Pointed uploads, accounts and sign-in at `framecast.frameempire.co.uk` instead of Cap's hosted service | Backend |
| Raised the declared minimum macOS version to 11.0 to match the built binary | Packaging |
| Removed the legacy `LSRequiresCarbon` and `CSResourcesFileMapped` keys | Packaging |
| Added this notice, the licence text and a third-party licence index to the application bundle | Compliance |

## Third-party components

FrameCast bundles a number of third-party libraries, several of which carry their own copyleft terms. See `THIRD-PARTY.md` in this folder, and the full licence texts in `Frameworks/Spacedrive.framework/Versions/A/Resources/Licenses/`.

Of particular note: the bundled FFmpeg is configured with `--enable-gpl --enable-version3` and includes x264, x265 and vvenc. That makes those libraries **GPLv3**, which is compatible with the AGPL-3.0 licence of the application itself, but it does mean FrameCast cannot be relicensed as proprietary software while it ships this FFmpeg build.

---

*Frame Empire Ltd, 4 Thameshill Avenue, Romford, Essex, RM5 3BU, United Kingdom.*
