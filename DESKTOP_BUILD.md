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

### 3. Code-signing certificate (DECIDED: skip for now)

Frame Empire decision: ship unsigned. The 6 employees receive the binary directly from you, click through SmartScreen once on first install, and FrameCast is then trusted on that machine. Standard for internal tools. Saves ~$120/year vs Azure Trusted Signing or ~$200/year vs Authenticode.

What employees will see on first install:
1. Double-click the .msi
2. "Windows protected your PC" blue popup
3. Click "More info" (small grey link at top)
4. Click "Run anyway" button that appears

After that, FrameCast launches like any other app. No recurring nag.

If you ever want to upgrade later, see "Future: enabling signing" near the bottom of this file.

### 4. Native build dependencies (Windows)

Before the first build, you need these on the machine (in addition to Node 20 + pnpm 10.5.2 already present):

1. **Rust 1.88.0 via rustup** (repo pins this via `rust-toolchain.toml`). `rustup` will auto-fetch when you `cd` into the repo.
2. **Visual Studio Build Tools 2026** (or 2022 17.12+) with the MSVC v143 C++ build tools component AND Windows 11 SDK 26100.
3. **CMake** ≥ 3.20 on PATH. `scoop install cmake` works without admin.
4. **libclang.dll from LLVM 18** (NOT 22+ - the latest LLVM has an ABI mismatch with `bindgen 0.70` that ships in `ffmpeg-sys-next 7.1.3`, producing opaque struct types for FFmpeg's bindings and making compilation fail). Easiest path: download `LLVM-18.1.8-win64.exe` from https://github.com/llvm/llvm-project/releases/tag/llvmorg-18.1.8, extract just `bin/libclang.dll` via 7-Zip (the installer file is a NullSoft archive, no need to actually install), and drop it anywhere. Then point `LIBCLANG_PATH` at it.

The build also calls `bindgen` against MSVC headers, which requires `BINDGEN_EXTRA_CLANG_ARGS` with `--target=x86_64-pc-windows-msvc -fms-compatibility -fms-extensions -fdeclspec` plus `-isystem` flags for the MSVC and Windows SDK include directories. Paths with spaces in BINDGEN_EXTRA_CLANG_ARGS are unreliable, so the recommended workaround is to make junctions (no admin needed) from no-space paths to the actual MSVC + SDK include dirs:

```powershell
New-Item -ItemType Directory C:\msvc-headers | Out-Null
cmd /c mklink /J C:\msvc-headers\msvc-include "C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Tools\MSVC\<your-MSVC-version>\include"
cmd /c mklink /J C:\msvc-headers\sdk-ucrt   "C:\Program Files (x86)\Windows Kits\10\Include\<your-SDK-version>\ucrt"
cmd /c mklink /J C:\msvc-headers\sdk-um     "C:\Program Files (x86)\Windows Kits\10\Include\<your-SDK-version>\um"
cmd /c mklink /J C:\msvc-headers\sdk-shared "C:\Program Files (x86)\Windows Kits\10\Include\<your-SDK-version>\shared"
```

The `pnpm cap-setup` script auto-downloads FFmpeg 7.1 from Gyan.dev and writes `.cargo/config.toml` with `FFMPEG_DIR` and `LIBCLANG_PATH`. You'll need to manually edit that file to add `BINDGEN_EXTRA_CLANG_ARGS` and `CMAKE_GENERATOR = "Visual Studio 18 2026"` (the latter is needed because the Ninja generator puts whisper.cpp's output at `out/build/whisper.lib` while the `whisper-rs-sys` build script looks for it at `out/build/Release/whisper.lib`).

Example final `.cargo/config.toml`:

```toml
[env]
FFMPEG_DIR = { relative = true, force = true, value = "target/native-deps" }
LIBCLANG_PATH = "C:/path/to/llvm18/bin/libclang.dll"
CMAKE_GENERATOR = "Visual Studio 18 2026"
BINDGEN_EXTRA_CLANG_ARGS = { force = true, value = "--target=x86_64-pc-windows-msvc -fms-compatibility -fms-extensions -fdeclspec -isystem C:/msvc-headers/msvc-include -isystem C:/msvc-headers/sdk-ucrt -isystem C:/msvc-headers/sdk-um -isystem C:/msvc-headers/sdk-shared" }
```

### 5. Build

From the repo root:

```
pnpm install        # if you haven't already
pnpm cap-setup      # downloads FFmpeg, writes .cargo/config.toml
pnpm tauri:build    # the actual build, 60 to 90 minutes first time
```

This runs the production pipeline:
1. `cap-muxer` Rust sidecar (small, few minutes)
2. `cap-exporter` Rust sidecar from `apps/cli` (huge - editor/export/rendering crates, 20 to 30 min)
3. `preparescript` (vite/vinxi env prep, instant)
4. Vinxi/Vite frontend bundle (few minutes)
5. `cap-desktop` main Rust crate (huge, ~30 min)
6. Tauri bundler wraps everything into `.msi` + NSIS `.exe` (few minutes)

Output lands in `apps/desktop/src-tauri/target/release/bundle/`:
- Windows: `.msi` and `.exe` (NSIS installer)
- macOS: `.dmg` and `.app`
- Linux: `.deb` and `.AppImage`

Subsequent builds are minutes (caching via cargo target/ and the `target/native-deps` ffmpeg cache).

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
- ~~WiX upgrade codes~~ DONE: fresh UUID `61d7d503-2cb4-4feb-84a6-1c452af9d73b` for FrameCast. No conflict with Cap if both happen to coexist on a machine.

## Future: enabling signing (if internal trust isn't enough later)

**Azure Trusted Signing (~$10/month, recommended path)**: https://learn.microsoft.com/en-us/azure/trusted-signing/
- Requires an Azure subscription with billing enabled
- Frame Empire identity verification by Microsoft (1-3 days)
- Install Azure CLI + Trusted Signing extension on the build machine
- Wire `signCommand` into `tauri.prod.conf.json` under `bundle.windows`

**Microsoft Authenticode (~$200/year)**: Hardware token from SSL.com, DigiCert, or Certum.

**Apple notarization (macOS only, ~$99/year)**: Apple Developer Program + signing certificate via Xcode + `xcrun notarytool`.

## Hosting the auto-updater (optional, do this later)

The updater is currently `active: false` in `tauri.prod.conf.json`. To re-enable for FrameCast:
1. Generate an Ed25519 keypair via `tauri signer generate -w ~/.tauri/framecast.key`
2. Put the public key in `plugins.updater.pubkey` in `tauri.prod.conf.json`
3. Build releases with `tauri build --updater`
4. Host the resulting `.tar.gz`/`.zip` + signature on a static URL (R2, GitHub Releases, etc.)
5. Set `plugins.updater.endpoints` to that URL pattern

Until then, employees install manually. For 6 people that's fine.
