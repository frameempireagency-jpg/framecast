# FrameCast's icon (23 October 2026)

Andrei asked for "a nice app logo similar to echo one" and picked option C, "Cast", from three drawings in ECHO's style.

## What it shows

A cream F with a green play button and two chevrons moving outwards, on the same deep purple tile ECHO uses. The F is FrameCast; play and the chevrons are recording and sending it on.

- Tile: diagonal gradient `#6A2BB3` to `#521F88` (Frame Empire purple) to `#26093F`, soft white glow top left, thin white edge. Same as ECHO's icon.
- F: Frame Empire's cream `#EFE9F8`, three rounded bars, built like ECHO's E.
- Play: green `#25D366`. Chevrons: lilac `#C4A9EC`, then cream at 55 per cent.

## The drawings

| File | Used for |
|---|---|
| `framecast-icon.svg` | 48 px and up, the Windows master, the in-app logos |
| `framecast-icon-small.svg` | 16, 24 and 32 px: no glow or edge, two-stop gradient, one chevron |
| `framecast-icon-mac.svg` | The macOS icon: the tile on Apple's grid (824 of 1024, 100 px margin) with a soft shadow |
| `framecast-tray-template.svg` | The macOS menu bar glyph. macOS reads only its shape and colours it to suit the menu bar |

The Windows system tray uses the small drawing in full colour (`tray-default-icon.png`); the three `tray-default-icon-<mode>.png` files are the Mac template glyph.

## How to rebuild

Needs Python with Pillow and Chrome or Edge (used headless, with its own throwaway profile). Run from the repo root, in this order:

```
python docs/design/2026-10-23-framecast-icon/make-icon.py
cd apps/desktop
pnpm tauri icon ../../target/logo/master-windows-1024.png
pnpm tauri icon ../../target/logo/master-mac-1024.png -o ../../target/logo/mac-out
cd ../..
cp target/logo/mac-out/icon.icns apps/desktop/src-tauri/icons/icon.icns
cp target/logo/mac-out/icon.icns apps/desktop/src-tauri/icons/macos/icon.icns
cp target/logo/mac-out/icon.icns apps/desktop/src-tauri/icons/icon-squircle.icns
python docs/design/2026-10-23-framecast-icon/make-icon.py
powershell -File scripts/gen-installer-bmps.ps1
```

`make-icon.py` runs twice because `tauri icon` overwrites `icon.ico` with a single drawing; the second run puts back the ICO that uses the small drawing at 16 to 32 px. The installer images read `target/logo/installer-mark-96.png`, which `make-icon.py` writes. `scripts/gen-dmg-background.ps1` draws the Mac installer window and has no icon in it.
