from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "apps/desktop/src/assets/theme-previews"
S = 2
SIZE = 330 * S

PURPLE = (139, 79, 214)
PURPLE_LIGHT_MODE = (82, 31, 136)
RED = (229, 72, 77)

THEMES = {
    "light": {
        "panel": (255, 255, 255),
        "tile": (241, 240, 244),
        "tile_shade": (231, 229, 236),
        "row": (241, 240, 244),
        "ink": (26, 20, 31),
        "muted": (120, 112, 130),
        "accent": PURPLE_LIGHT_MODE,
    },
    "dark": {
        "panel": (24, 22, 28),
        "tile": (38, 35, 44),
        "tile_shade": (48, 44, 56),
        "row": (38, 35, 44),
        "ink": (239, 233, 248),
        "muted": (150, 140, 162),
        "accent": PURPLE,
    },
}


def s(v):
    return int(round(v * S))


def backdrop():
    img = Image.new("RGB", (SIZE, SIZE))
    px = img.load()
    stops = [(0.0, (106, 43, 179)), (0.55, (82, 31, 136)), (1.0, (38, 9, 63))]
    for y in range(SIZE):
        for x in range(SIZE):
            t = (x + y) / (2 * (SIZE - 1))
            for i in range(len(stops) - 1):
                a, ca = stops[i]
                b, cb = stops[i + 1]
                if a <= t <= b:
                    k = (t - a) / (b - a)
                    px[x, y] = tuple(int(ca[j] + (cb[j] - ca[j]) * k) for j in range(3))
                    break
    glow = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(glow).ellipse((s(-60), s(-80), s(200), s(170)), fill=70)
    glow = glow.filter(ImageFilter.GaussianBlur(s(55)))
    img = Image.composite(Image.new("RGB", (SIZE, SIZE), (255, 255, 255)), img, glow)
    green = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(green).ellipse((s(200), s(230), s(380), s(380)), fill=40)
    green = green.filter(ImageFilter.GaussianBlur(s(50)))
    return Image.composite(Image.new("RGB", (SIZE, SIZE), (37, 211, 102)), img, green)


def line(d, x, y, w, c):
    d.rounded_rectangle((s(x), s(y - 1.6), s(x + w), s(y + 1.6)), radius=s(1.6), fill=c)


def icon(d, kind, cx, cy, c):
    w = s(1.8)
    if kind == "screen":
        d.rounded_rectangle((s(cx - 12), s(cy - 10), s(cx + 12), s(cy + 6)), radius=s(2), outline=c, width=w)
        d.line((s(cx), s(cy + 6), s(cx), s(cy + 10)), fill=c, width=w)
        d.line((s(cx - 6), s(cy + 10.5), s(cx + 6), s(cy + 10.5)), fill=c, width=w)
    elif kind == "window":
        d.rounded_rectangle((s(cx - 12), s(cy - 9), s(cx + 12), s(cy + 9)), radius=s(2.5), outline=c, width=w)
        for i in range(3):
            d.ellipse((s(cx - 8 + i * 3.4), s(cy - 5.5), s(cx - 6.4 + i * 3.4), s(cy - 3.9)), fill=c)
    elif kind == "area":
        for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            x0, y0 = cx + sx * 10, cy + sy * 8
            d.line((s(x0), s(y0), s(x0 - sx * 4), s(y0)), fill=c, width=w)
            d.line((s(x0), s(y0), s(x0), s(y0 - sy * 4)), fill=c, width=w)
    elif kind == "camera":
        d.rounded_rectangle((s(cx - 10), s(cy - 6), s(cx + 3), s(cy + 6)), radius=s(2), outline=c, width=w)
        d.polygon([(s(cx + 4), s(cy)), (s(cx + 10), s(cy - 5)), (s(cx + 10), s(cy + 5))], outline=c, width=w)
    elif kind == "mic":
        d.rounded_rectangle((s(cx - 3.5), s(cy - 10), s(cx + 3.5), s(cy + 2)), radius=s(3.5), outline=c, width=w)
        d.arc((s(cx - 7), s(cy - 6), s(cx + 7), s(cy + 6)), 0, 180, fill=c, width=w)
        d.line((s(cx), s(cy + 6), s(cx), s(cy + 10)), fill=c, width=w)


def toggle(d, x, y, c):
    d.rounded_rectangle((s(x), s(y - 10), s(x + 30), s(y + 10)), radius=s(10), fill=c)
    line(d, x + 8, y, 14, (255, 255, 255))


def panel(theme, x0):
    t = THEMES[theme]
    layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    shadow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((s(x0), s(-14), s(x0 + 300), s(268)), radius=s(18), fill=(18, 4, 38, 110))
    shadow = shadow.filter(ImageFilter.GaussianBlur(s(14)))
    layer.alpha_composite(shadow)
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle((s(x0), s(-20), s(x0 + 300), s(258)), radius=s(16), fill=t["panel"])
    for i, kind in enumerate(("screen", "window", "area")):
        tx = x0 + 12 + i * 91
        d.rounded_rectangle((s(tx), s(18), s(tx + 82), s(86)), radius=s(12), fill=t["tile"])
        d.rounded_rectangle((s(tx + 60), s(18), s(tx + 82), s(86)), radius=s(12), fill=t["tile_shade"])
        d.rectangle((s(tx + 60), s(18), s(tx + 70), s(86)), fill=t["tile_shade"])
        icon(d, kind, tx + 31, 45, t["ink"] if i < 2 else t["muted"])
        line(d, tx + 9, 72, 44 if i < 2 else 22, t["ink"] if i < 2 else t["muted"])
    rows = (("camera", 112, RED), ("mic", 70, t["accent"]), ("screen", 104, t["accent"]))
    for i, (kind, width, color) in enumerate(rows):
        y = 118 + i * 50
        d.rounded_rectangle((s(x0 + 12), s(y - 20), s(x0 + 300), s(y + 20)), radius=s(10), fill=t["row"])
        icon(d, kind, x0 + 30, y, t["muted"])
        line(d, x0 + 51, y, width, t["ink"])
        toggle(d, x0 + 236, y, color)
    return layer


def save(img, name):
    img.convert("RGB").resize((330, 330), Image.LANCZOS).save(OUT / name, quality=92)
    print("wrote", name)


def main():
    bg = backdrop()
    for theme, x0 in (("light", 82), ("dark", 82)):
        im = bg.convert("RGBA")
        im.alpha_composite(panel(theme, x0))
        save(im, f"{theme}.jpg")
    light = bg.convert("RGBA")
    light.alpha_composite(panel("light", 22))
    dark = bg.convert("RGBA")
    dark.alpha_composite(panel("dark", 22))
    mask = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(mask).polygon([(s(250), 0), (SIZE, 0), (SIZE, SIZE), (s(125), SIZE)], fill=255)
    save(Image.composite(dark, light, mask), "auto.jpg")


if __name__ == "__main__":
    main()
