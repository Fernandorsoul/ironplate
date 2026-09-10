"""Generate IronPlate brand assets (Forge Plate mark)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(r"C:\Users\ferna\Desktop\Nova pasta\ironplate")
ASSETS = ROOT / "assets"
BRAND = ASSETS / "brand"

IRON = (26, 26, 46, 255)
FORGE = (255, 107, 53, 255)
FORGE_DEEP = (229, 90, 43, 255)
PLATE = (22, 33, 62, 255)
STEEL = (178, 190, 195, 255)


def draw_mark(size: int, transparent: bool = False) -> Image.Image:
    s = size * 4
    bg = (0, 0, 0, 0) if transparent else IRON
    img = Image.new("RGBA", (s, s), bg)
    d = ImageDraw.Draw(img)
    c = s // 2

    def u(v: float) -> int:
        return int(round(v * s / 1024))

    def ring(r_outer: int, r_inner: int, color) -> None:
        d.ellipse([c - r_outer, c - r_outer, c + r_outer, c + r_outer], fill=color)
        if r_inner > 0:
            d.ellipse(
                [c - r_inner, c - r_inner, c + r_inner, c + r_inner],
                fill=bg if not transparent else (0, 0, 0, 0),
            )

    # Solid plate body
    d.ellipse([c - u(340), c - u(340), c + u(340), c + u(340)], fill=FORGE)
    # Inner face (creates the rim band)
    d.ellipse([c - u(280), c - u(280), c + u(280), c + u(280)], fill=PLATE)
    # Thin accent ring inside face
    d.ellipse(
        [c - u(268), c - u(268), c + u(268), c + u(268)],
        outline=FORGE_DEEP,
        width=u(8),
    )

    # Grip notches punched through the orange rim
    notch_r = u(36)
    for nx, ny in (
        (c, c - u(310)),
        (c, c + u(310)),
        (c - u(310), c),
        (c + u(310), c),
    ):
        d.ellipse(
            [nx - notch_r, ny - notch_r, nx + notch_r, ny + notch_r],
            fill=IRON if not transparent else (26, 26, 46, 255),
        )

    # Hub
    d.ellipse([c - u(92), c - u(92), c + u(92), c + u(92)], fill=IRON)
    d.ellipse(
        [c - u(92), c - u(92), c + u(92), c + u(92)],
        outline=FORGE,
        width=u(16),
    )

    # Iron bar "I"
    d.rounded_rectangle(
        [c - u(24), c - u(152), c + u(24), c + u(152)],
        radius=u(12),
        fill=FORGE,
    )
    d.rounded_rectangle(
        [c - u(82), c - u(152), c + u(82), c - u(116)],
        radius=u(10),
        fill=STEEL,
    )
    d.rounded_rectangle(
        [c - u(82), c + u(116), c + u(82), c + u(152)],
        radius=u(10),
        fill=STEEL,
    )

    return img.resize((size, size), Image.Resampling.LANCZOS)


def save(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, format="PNG", optimize=True)
    print(f"wrote {path.relative_to(ROOT)} {img.size}")


def main() -> None:
    save(draw_mark(1024), ASSETS / "icon.png")
    save(draw_mark(1024), BRAND / "icon-1024.png")
    save(draw_mark(512), BRAND / "icon-512.png")

    save(draw_mark(48), ASSETS / "favicon.png")
    save(draw_mark(32), BRAND / "favicon-32.png")
    save(draw_mark(180), BRAND / "apple-touch-180.png")

    splash = Image.new("RGBA", (1024, 1024), IRON)
    mark = draw_mark(720, transparent=True)
    splash.paste(mark, ((1024 - 720) // 2, (1024 - 720) // 2), mark)
    save(splash, ASSETS / "splash-icon.png")
    save(splash, BRAND / "splash-1024.png")

    fg = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    mark_fg = draw_mark(640, transparent=True)
    fg.paste(mark_fg, ((1024 - 640) // 2, (1024 - 640) // 2), mark_fg)
    bg = Image.new("RGBA", (1024, 1024), IRON)
    save(fg, ASSETS / "android-icon-foreground.png")
    save(bg, ASSETS / "android-icon-background.png")

    mono_src = draw_mark(640, transparent=True)
    mono = Image.new("RGBA", mono_src.size, (0, 0, 0, 0))
    src = mono_src.load()
    dst = mono.load()
    for y in range(mono_src.size[1]):
        for x in range(mono_src.size[0]):
            r, g, b, a = src[x, y]
            if a > 0:
                dst[x, y] = (255, 255, 255, a)
    mono_canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    mono_canvas.paste(mono, ((1024 - 640) // 2, (1024 - 640) // 2), mono)
    save(mono_canvas, ASSETS / "android-icon-monochrome.png")


if __name__ == "__main__":
    main()
