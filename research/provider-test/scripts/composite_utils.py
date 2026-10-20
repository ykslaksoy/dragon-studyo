"""Shared compositing helpers — reduce cut-and-paste look within free canvas limits."""

from __future__ import annotations

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont


def load_font(size: int = 12):
    from pathlib import Path

    p = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
    return ImageFont.truetype(str(p), size=size) if p.exists() else ImageFont.load_default()


def feather_alpha(rgba: Image.Image, radius: int = 2) -> Image.Image:
    rgba = rgba.convert("RGBA")
    r, g, b, a = rgba.split()
    a = a.filter(ImageFilter.GaussianBlur(radius))
    return Image.merge("RGBA", (r, g, b, a))


def tint_to_background(rgba: Image.Image, bg_rgb: tuple[int, int, int], strength: float = 0.12) -> Image.Image:
    """Mild color harmony so product does not float with wrong white balance."""
    arr = np.array(rgba, dtype=np.float32)
    rgb = arr[..., :3]
    a = arr[..., 3:4] / 255.0
    target = np.array(bg_rgb, dtype=np.float32)
    rgb = rgb * (1 - strength * a) + target * (strength * a)
    out = np.clip(rgb, 0, 255).astype(np.uint8)
    return Image.fromarray(np.dstack([out, arr[..., 3].astype(np.uint8)]), "RGBA")


def vignette(rgb: Image.Image, strength: float = 0.35) -> Image.Image:
    w, h = rgb.size
    arr = np.array(rgb.convert("RGB"), dtype=np.float32)
    ys = np.linspace(-1, 1, h)[:, None]
    xs = np.linspace(-1, 1, w)[None, :]
    mask = 1.0 - strength * (xs**2 + ys**2)
    mask = np.clip(mask, 0.55, 1.0)
    arr *= mask[..., None]
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")


def draw_floor_plane(base_rgba: Image.Image, y_frac: float = 0.72) -> Image.Image:
    """Soft studio floor ellipse for grounding."""
    w, h = base_rgba.size
    d = ImageDraw.Draw(base_rgba)
    fy = int(h * y_frac)
    d.ellipse((w * 0.15, fy - 20, w * 0.85, fy + 80), fill=(0, 0, 0, 35))
    d.rectangle((0, fy, w, h), fill=(0, 0, 0, 18))
    return base_rgba


def contact_shadow(prod: Image.Image, blur: int = 10, opacity: float = 0.4) -> Image.Image:
    sh = Image.new("RGBA", prod.size, (0, 0, 0, 0))
    sh.putalpha(prod.split()[-1].point(lambda a: int(a * opacity)))
    return sh.filter(ImageFilter.GaussianBlur(blur))


def composite_overlay(
    bg: Image.Image,
    cutout: Image.Image,
    *,
    scale: float,
    cx: float,
    cy: float,
    rotate: float = 0.0,
    shadow_dx: int = 10,
    shadow_dy: int = 14,
) -> Image.Image:
    W, H = bg.size
    bg_v = vignette(bg, 0.25)
    layer = draw_floor_plane(bg_v.convert("RGBA"))
    prod = feather_alpha(cutout, radius=1)

    # Sample local bg color for harmony
    sx, sy = int(W * cx), int(H * cy)
    sx = max(0, min(W - 1, sx))
    sy = max(0, min(H - 1, sy))
    local = bg_v.getpixel((sx, sy))
    prod = tint_to_background(prod, local, 0.1)

    th = int(H * scale)
    th = max(36, min(th, int(H * 0.8)))
    r = th / prod.size[1]
    nw = max(1, int(prod.size[0] * r))
    prod = prod.resize((nw, th), Image.Resampling.LANCZOS)
    if abs(rotate) > 0.05:
        prod = prod.rotate(rotate, resample=Image.Resampling.BICUBIC, expand=True)

    px = int(W * cx - prod.size[0] / 2)
    py = int(H * cy - prod.size[1] / 2)
    px = max(0, min(px, W - prod.size[0]))
    py = max(0, min(py, H - prod.size[1]))

    cast = contact_shadow(prod, blur=16, opacity=0.28)
    contact = contact_shadow(prod, blur=4, opacity=0.55)
    out = layer.copy()
    out.paste(cast, (px + shadow_dx, py + shadow_dy), cast)
    out.paste(contact, (px + 2, py + 4), contact)
    out.paste(prod, (px, py), prod)
    return out


def composite_pedestal(bg: Image.Image, cutout: Image.Image, scale: float = 0.42) -> Image.Image:
    """
    Product hero on studio floor — background stock is blurred (context only).
    Avoids 'sticker on model' for lifestyle frames we cannot truly generate.
    """
    W, H = bg.size
    blurred = bg.filter(ImageFilter.GaussianBlur(14))
    top = Image.new("RGBA", (W, H), (245, 246, 248, 255))
    base = Image.blend(blurred.convert("RGBA"), top, 0.55)
    base = draw_floor_plane(vignette(base.convert("RGB"), 0.2).convert("RGBA"), y_frac=0.78)

    prod = feather_alpha(cutout, 2)
    prod = tint_to_background(prod, (240, 241, 243), 0.08)
    th = int(H * scale)
    r = th / prod.size[1]
    prod = prod.resize((max(1, int(prod.size[0] * r)), th), Image.Resampling.LANCZOS)

    px = (W - prod.size[0]) // 2
    py = int(H * 0.78 - prod.size[1])
    out = base.copy()
    sh = contact_shadow(prod, 18, 0.32)
    out.paste(sh, (px + 8, py + 12), sh)
    out.paste(prod, (px, py), prod)

    # subtle reflection
    refl = prod.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    refl.putalpha(refl.split()[-1].point(lambda a: int(a * 0.12)))
    out.paste(refl, (px, py + prod.size[1] + 4), refl)
    return out
