import io
import os
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
CHROME_CANDIDATES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
]


def chrome() -> str:
    for c in CHROME_CANDIDATES:
        if os.path.exists(c):
            return c
    sys.exit("No Chrome or Edge found to render the SVGs")


def render(svg: str, size: int) -> Image.Image:
    canvas = max(size, 600)
    src = (HERE / svg).as_uri()
    html = (
        "<!doctype html><html><head><style>html,body{margin:0;background:transparent}"
        f"img{{display:block;width:{size}px;height:{size}px}}</style></head>"
        f'<body><img src="{src}"></body></html>'
    )
    with tempfile.TemporaryDirectory() as tmp:
        page = Path(tmp) / "page.html"
        page.write_text(html, encoding="utf-8")
        shot = Path(tmp) / "shot.png"
        profile = Path(tmp) / "profile"
        subprocess.run(
            [
                chrome(),
                "--headless=new",
                f"--user-data-dir={profile}",
                "--no-first-run",
                "--no-default-browser-check",
                "--disable-extensions",
                "--disable-gpu",
                "--hide-scrollbars",
                "--force-device-scale-factor=1",
                "--default-background-color=00000000",
                "--allow-file-access-from-files",
                f"--window-size={canvas},{canvas}",
                f"--screenshot={shot}",
                page.as_uri(),
            ],
            check=True,
            capture_output=True,
            timeout=90,
        )
        img = Image.open(shot).convert("RGBA").crop((0, 0, size, size))
        img.load()
        return img


def save(img: Image.Image, rel: str) -> None:
    out = ROOT / rel
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out)
    print("wrote", rel)


def ico(images: list[Image.Image], rel: str) -> None:
    entries = []
    for im in images:
        buf = io.BytesIO()
        im.save(buf, format="PNG")
        entries.append((im.width, buf.getvalue()))
    header = (0).to_bytes(2, "little") + (1).to_bytes(2, "little") + len(entries).to_bytes(2, "little")
    offset = 6 + 16 * len(entries)
    table = b""
    blob = b""
    for w, data in entries:
        dim = 0 if w >= 256 else w
        table += bytes([dim, dim, 0, 0]) + (1).to_bytes(2, "little") + (32).to_bytes(2, "little")
        table += len(data).to_bytes(4, "little") + offset.to_bytes(4, "little")
        offset += len(data)
        blob += data
    out = ROOT / rel
    out.write_bytes(header + table + blob)
    print("wrote", rel)


def main() -> None:
    icons = "apps/desktop/src-tauri/icons"
    save(render("framecast-icon.svg", 1024), "target/logo/master-windows-1024.png")
    save(render("framecast-icon-mac.svg", 1024), "target/logo/master-mac-1024.png")
    save(render("framecast-icon-mac.svg", 512), f"{icons}/macos/icon.png")

    small = {s: render("framecast-icon-small.svg", s) for s in (16, 24, 32)}
    full = {s: render("framecast-icon.svg", s) for s in (48, 64, 128, 256)}
    sizes = {**small, **full}
    ico([sizes[s] for s in (16, 24, 32, 48, 64, 128, 256)], f"{icons}/icon.ico")
    ico([sizes[s] for s in (16, 24, 32, 48)], "apps/web/public/favicon.ico")
    save(small[16], "apps/web/public/favicon-16x16.png")
    save(small[32], "apps/web/public/favicon-32x32.png")
    save(small[32], f"{icons}/tray-default-icon.png")
    save(full[64], "target/logo/installer-mark-64.png")
    save(render("framecast-icon.svg", 96), "target/logo/installer-mark-96.png")

    template = render("framecast-tray-template.svg", 424)
    for mode in ("studio", "instant", "screenshot"):
        save(template, f"{icons}/tray-default-icon-{mode}.png")


if __name__ == "__main__":
    main()
