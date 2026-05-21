# FrameCast Desktop build guide

The desktop app source is rebranded to FrameCast. To actually ship a binary you can install on Frame Empire employee machines, follow this.

## What's already rebranded

- `apps/desktop/src-tauri/tauri.conf.json` and `tauri.prod.conf.json`: productName, mainBinaryName, identifier (`co.uk.frameempire.framecast`), deep-link scheme (`framecast`), fileAssociation name. Updater is off (no FrameCast update server yet).
- `apps/desktop/src-tauri/Cargo.toml`: description, authors.
- `apps/desktop/src-tauri/icons/32x32.png`, `128x128.png`, `128x128@2x.png`: replaced with FrameCast purple corner-frame icon.
- `apps/desktop/src-tauri/src/windows.rs`: every window title now says FrameCast.
- `apps/desktop/src-tauri/src/general_settings.rs`: default excluded window titles + transcription hints updated.
- `apps/desktop/src-tauri/src/web_api.rs` and `apps/desktop/src/utils/env.ts`: default server URL points at `https://framecast.frameempire.co.uk` (your planned production deployment) instead of `cap.so`.
- `apps/desktop/src/...` (Solid frontend): user-visible "Welcome to Cap", "Cap Studio", "Cap Pro", "Cap AI", "Cap Cloud" strings and `cap.so/{pricing,download,blog}` URLs are all rewritten.

## What's still needed before you can hand the binary to employees

### 1. Convert FrameCast icon to .icns and .ico (one-time)

Tauri's bundler needs `apps/desktop/src-tauri/icons/icon.icns` (macOS) and `icons/icon.ico` (Windows). They're still the upstream Cap icons because converting requires tools I do not have access to.

On macOS:
```
mkdir framecast.iconset
sips -z 16 16 apps/web/public/framecast-icon.png --out framecast.iconset/icon_16x16.png
sips -z 32 32 apps/web/public/framecast-icon.png --out framecast.iconset/icon_16x16@2x.png
sips -z 32 32 apps/web/public/framecast-icon.png --out framecast.iconset/icon_32x32.png
sips -z 64 64 apps/web/public/framecast-icon.png --out framecast.iconset/icon_32x32@2x.png
sips -z 128 128 apps/web/public/framecast-icon.png --out framecast.iconset/icon_128x128.png
sips -z 256 256 apps/web/public/framecast-icon.png --out framecast.iconset/icon_128x128@2x.png
sips -z 256 256 apps/web/public/framecast-icon.png --out framecast.iconset/icon_256x256.png
sips -z 512 512 apps/web/public/framecast-icon.png --out framecast.iconset/icon_256x256@2x.png
sips -z 512 512 apps/web/public/framecast-icon.png --out framecast.iconset/icon_512x512.png
sips -z 1024 1024 apps/web/public/framecast-icon.png --out framecast.iconset/icon_512x512@2x.png
iconutil -c icns framecast.iconset -o apps/desktop/src-tauri/icons/icon.icns
```

On Windows (with ImageMagick installed):
```
magick apps/web/public/framecast-icon.png -define icon:auto-resize=16,32,48,64,128,256 apps/desktop/src-tauri/icons/icon.ico
```

Or use https://icoconvert.com (manual web upload) for a one-off.

The Windows Store / Tile icons (`Square*Logo.png`) inside `apps/desktop/src-tauri/icons/` are also still Cap. They only matter if you publish to the Microsoft Store, which is not the plan for an internal tool. Safe to leave.

### 2. Install Rust toolchain

The Tauri build needs Rust 1.78+. Easiest:

```
winget install Rustlang.Rustup
rustup default stable
```

Or download `rustup-init.exe` from https://rustup.rs. ~1 GB on disk.

You also need:
- Windows: nothing else (Tauri uses MSVC via Visual Studio Build Tools, the rustup installer offers to install them)
- macOS: Xcode Command Line Tools (`xcode-select --install`)

### 3. Code-signing certificate

Without one, double-clicking the installer on a fresh Windows machine shows a "Windows protected your PC - SmartScreen" warning and employees must click "More info" then "Run anyway". macOS Gatekeeper is similar but harsher.

Two options:

**Microsoft Authenticode (~$200/year)**: Buy from a vendor like SSL.com, DigiCert, or Certum. Comes as a hardware token (USB or cloud-based). Tauri's bundler picks it up via the `tauri-build` config or signed post-build.

**Azure Trusted Signing (~$10/month)**: Microsoft's cloud signing. Cheaper and easier. https://learn.microsoft.com/en-us/azure/trusted-signing/

For 6 employees who are getting the binary directly from you, you can also just send them a self-signed installer and tell them to click through SmartScreen. Not ideal but works.

For Apple notarization (macOS only): Apple Developer Program $99/year + a signing certificate generated via Xcode + `xcrun notarytool` after the build.

### 4. Build

From the repo root:

```
pnpm install
pnpm --filter @cap/desktop tauri build
```

Output lands in `apps/desktop/src-tauri/target/release/bundle/`:
- Windows: `.msi` and `.exe` (NSIS installer)
- macOS: `.dmg` and `.app`
- Linux: `.deb` and `.AppImage`

First build is slow (Rust compilation, 30-60 min). Subsequent builds are minutes.

### 5. Distribute

Internal-only distribution suggestions:
- Drop the signed `.msi` into a shared Google Drive folder
- Send a direct download link via Slack/email
- Or host on Cloudflare R2 alongside your recordings, generate a signed URL valid for the team

The desktop app talks to your FrameCast backend at `framecast.frameempire.co.uk` by default. Override via `VITE_SERVER_URL` build env var if you want a different URL.

## What I deliberately did not touch

- Cargo package name `cap-desktop`, library name `cap_desktop_lib`, Rust crate prefixes `cap-*`. These are internal package identifiers, not user-facing. Renaming would cascade into every workspace import path.
- `@cap/desktop` workspace name. Same reason.
- Internal Rust types like `CapWindowId`, `CapWindowAttributes`. Code identifiers, not display strings.
- All the `crates/cap-*` packages. Internal Rust crates.
- Auto-generated Tauri bindings (`apps/desktop/src/utils/tauri.ts`).
- WiX upgrade codes - if you ever ship a real Windows installer you need to generate a fresh UUID for `tauri.prod.conf.json` `windows.wix.upgradeCode`, otherwise installs will try to upgrade the upstream Cap if a user has it.

## Hosting the auto-updater (optional, do this later)

The updater is currently `active: false` in `tauri.prod.conf.json`. To re-enable for FrameCast:
1. Generate an Ed25519 keypair via `tauri signer generate -w ~/.tauri/framecast.key`
2. Put the public key in `plugins.updater.pubkey` in `tauri.prod.conf.json`
3. Build releases with `tauri build --updater`
4. Host the resulting `.tar.gz`/`.zip` + signature on a static URL (R2, GitHub Releases, etc.)
5. Set `plugins.updater.endpoints` to that URL pattern

Until then, employees install manually. For 6 people that's fine.
