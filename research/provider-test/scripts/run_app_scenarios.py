#!/usr/bin/env python3
"""
Render every studio package frame (with all optional angles) using Dragon free stack:
BiRefNet cutout + canvas backgrounds, shadows, crop/zoom/rotate per frame.

Outputs one labeled grid per (test_image, purpose, package_id).
"""

from __future__ import annotations

import json
import re
import shutil
import sys
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from studio_catalog import (
    all_angle_labels,
    build_output_list,
    frame_spec,
    iter_all_packages,
)

ROOT = Path(__file__).resolve().parents[1]
SOURCES_DIR = ROOT / "sources"
MANIFEST = SOURCES_DIR / "manifest.json"
IMAGES_DIR = ROOT / "images"
ARTIFACTS = Path("/opt/cursor/artifacts/provider-test")
OUT_SUB = "app-scenarios"

for base in (IMAGES_DIR / OUT_SUB, ARTIFACTS / OUT_SUB):
    base.mkdir(parents=True, exist_ok=True)
(IMAGES_DIR / "cutouts").mkdir(parents=True, exist_ok=True)
(ARTIFACTS / "cutouts").mkdir(parents=True, exist_ok=True)


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for name in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ):
        if Path(name).exists():
            return ImageFont.truetype(name, size=size)
    return ImageFont.load_default()


FONT_XS = load_font(11)
FONT_SM = load_font(12)
FONT_MD = load_font(14)


def save_dual(rel: str, img: Image.Image, jpeg: bool = True) -> tuple[str, str]:
    rel_path = Path(rel)
    commit = IMAGES_DIR / rel_path
    artifact = ARTIFACTS / rel_path
    commit.parent.mkdir(parents=True, exist_ok=True)
    artifact.parent.mkdir(parents=True, exist_ok=True)
    if jpeg:
        img.convert("RGB").save(commit, quality=90)
        img.convert("RGB").save(artifact, quality=90)
    else:
        img.save(commit)
        img.save(artifact)
    return str(commit), str(artifact)


def slugify(text: str, max_len: int = 80) -> str:
    s = re.sub(r"[^\w\s-]", "", text, flags=re.UNICODE)
    s = re.sub(r"[-\s]+", "_", s.strip()).lower()
    return s[:max_len] or "frame"


def get_cutout(image_id: str, src: Image.Image) -> Image.Image:
    cache_c = IMAGES_DIR / "cutouts" / f"{image_id}.png"
    cache_a = ARTIFACTS / "cutouts" / f"{image_id}.png"
    if cache_c.exists():
        return Image.open(cache_c).convert("RGBA")
    # Import rembg helper from benchmark script
    sys.path.insert(0, str(Path(__file__).parent))
    from run_benchmark import rembg_remove

    rgba = rembg_remove(src, "birefnet-general")
    rgba.save(cache_c)
    rgba.save(cache_a)
    return rgba


def gradient_bg(size: tuple[int, int], top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    w, h = size
    arr = np.zeros((h, w, 3), dtype=np.uint8)
    for y in range(h):
        t = y / max(h - 1, 1)
        arr[y] = [
            int(top[i] * (1 - t) + bottom[i] * t) for i in range(3)
        ]
    return Image.fromarray(arr, "RGB")


def purpose_palette(purpose: str) -> tuple[tuple[int, int, int], tuple[int, int, int]]:
    if purpose == "marketplace":
        return (252, 252, 253), (235, 236, 238)
    if purpose == "live":
        return (255, 238, 220), (255, 210, 175)
    if purpose == "creator":
        return (248, 250, 255), (220, 228, 245)
    return (28, 30, 42), (12, 14, 24)


def angle_transform(angle: str | None) -> dict:
    """Canvas-only camera simulation from single photo."""
    if not angle:
        return {"scale": 0.72, "rotate": 0.0, "ox": 0.0, "oy": 0.0, "crop": 1.0}
    mapping = {
        "Ön": {"scale": 0.74, "rotate": 0.0, "ox": 0.0, "oy": 0.02, "crop": 1.0},
        "3/4": {"scale": 0.7, "rotate": -10.0, "ox": -0.06, "oy": 0.03, "crop": 1.0},
        "Üst": {"scale": 0.62, "rotate": -28.0, "ox": 0.0, "oy": 0.08, "crop": 0.95},
        "Makro": {"scale": 0.95, "rotate": 0.0, "ox": 0.0, "oy": 0.0, "crop": 0.45},
        "Düşük açı": {"scale": 0.78, "rotate": 6.0, "ox": 0.0, "oy": -0.08, "crop": 1.0},
    }
    return mapping.get(angle, {"scale": 0.72, "rotate": 0.0, "ox": 0.0, "oy": 0.0, "crop": 1.0})


def frame_transform(base: str) -> dict:
    b = base.lower()
    t = {"scale_mul": 1.0, "rotate_add": 0.0, "ox": 0.0, "oy": 0.0, "crop": 1.0, "wide": False}
    if "45" in b or "45°" in base:
        t.update({"rotate_add": -8, "ox": -0.04})
    if "detay" in b or "makro" in b or "texture" in b or "yakın" in b:
        t.update({"crop": 0.42, "scale_mul": 1.15})
    if "flat lay" in b:
        t.update({"rotate_add": -32, "oy": 0.06, "scale_mul": 0.85})
    if "mobil" in b or "thumbnail" in b:
        t.update({"crop": 0.88, "scale_mul": 0.9})
    if "cta" in b or "caption" in b or "a+" in b or "negative space" in b:
        t.update({"ox": -0.18, "scale_mul": 0.65})
    if "cinematic" in b or "mood" in b or "dramatic" in b:
        t.update({"wide": True, "scale_mul": 0.55, "oy": 0.05})
    if "abstract" in b:
        t.update({"crop": 0.35, "rotate_add": 12})
    if "hook" in b or "end card" in b:
        t.update({"ox": 0.15, "scale_mul": 0.6})
    if "multi-angle" in b:
        t.update({"rotate_add": 14, "crop": 0.8})
    if "varyant" in b:
        t.update({"scale_mul": 0.5, "ox": -0.22})
    return t


def render_frame(
    cutout: Image.Image,
    purpose: str,
    spec: frame_spec,
    size: tuple[int, int] = (1080, 1080),
) -> Image.Image:
    W, H = size
    if frame_transform(spec.base_frame).get("wide"):
        W, H = 1280, 720

    top, bottom = purpose_palette(purpose)
    if spec.realism == "needs_gen_ai" and purpose == "artistic":
        top, bottom = (35, 32, 48), (10, 8, 18)
    base = gradient_bg((W, H), top, bottom).convert("RGBA")

    at = angle_transform(spec.angle_label)
    ft = frame_transform(spec.base_frame)
    crop = min(at["crop"], ft["crop"])
    scale = at["scale"] * ft["scale_mul"]
    rotate = at["rotate"] + ft["rotate_add"]
    ox_frac = at["ox"] + ft["ox"]
    oy_frac = at["oy"] + ft["oy"]

    prod = cutout.convert("RGBA")
    if crop < 0.99:
        w, h = prod.size
        cw, ch = int(w * crop), int(h * crop)
        left = (w - cw) // 2
        top_c = (h - ch) // 2
        prod = prod.crop((left, top_c, left + cw, top_c + ch))

    target_h = int(H * scale)
    target_h = max(80, min(target_h, int(H * 0.92)))
    ratio = target_h / prod.size[1]
    nw, nh = max(1, int(prod.size[0] * ratio)), target_h
    prod = prod.resize((nw, nh), Image.Resampling.LANCZOS)
    if abs(rotate) > 0.1:
        prod = prod.rotate(rotate, resample=Image.Resampling.BICUBIC, expand=True)

    shadow = Image.new("RGBA", prod.size, (0, 0, 0, 0))
    shadow.putalpha(prod.split()[-1].point(lambda a: int(a * 0.32)))
    shadow = shadow.filter(ImageFilter.GaussianBlur(14))

    px = int(W * (0.5 + ox_frac) - prod.size[0] / 2)
    py = int(H * (0.56 + oy_frac) - prod.size[1] / 2)
    px = max(10, min(px, W - prod.size[0] - 10))
    py = max(10, min(py, H - prod.size[1] - 10))

    layer = base.copy()
    layer.paste(shadow, (px + 16, py + 20), shadow)
    layer.paste(prod, (px, py), prod)

    if "cta" in spec.base_frame.lower() or "caption" in spec.base_frame.lower():
        d = ImageDraw.Draw(layer)
        d.rounded_rectangle((W - 360, H - 140, W - 40, H - 50), radius=20, fill=(0, 0, 0, 140))
        d.text((W - 340, H - 115), "CTA / caption zone", fill=(255, 255, 255, 230), font=FONT_SM)

    if spec.realism == "needs_gen_ai":
        d = ImageDraw.Draw(layer)
        d.rectangle((8, 8, W - 8, 56), fill=(120, 30, 30, 200))
        d.text((16, 18), "NEEDS GENERATIVE AI (canvas placeholder)", fill=(255, 220, 220), font=FONT_SM)
    elif spec.realism == "canvas_sim":
        d = ImageDraw.Draw(layer)
        d.rectangle((8, H - 44, W - 8, H - 8), fill=(30, 30, 30, 170))
        d.text((16, H - 34), "Canvas sim — not a true new angle/scene", fill=(210, 210, 210), font=FONT_XS)

    return layer.convert("RGB")


def build_package_grid(
    cells: list[tuple[str, Image.Image, str]],
    title: str,
    cols: int = 6,
) -> Image.Image:
    pad, lw, cw, ch = 6, 52, 280, 280
    rows = (len(cells) + cols - 1) // cols
    gw = cols * (cw + pad) + pad
    gh = rows * (ch + lw + pad) + pad + 36
    grid = Image.new("RGB", (gw, gh), (24, 24, 26))
    d = ImageDraw.Draw(grid)
    d.text((pad, 8), title, fill=(200, 255, 160), font=FONT_MD)
    for i, (label, im, realism) in enumerate(cells):
        r, c = divmod(i, cols)
        x0 = pad + c * (cw + pad)
        y0 = pad + 28 + r * (ch + lw + pad)
        thumb = im.copy()
        thumb.thumbnail((cw, ch), Image.Resampling.LANCZOS)
        tile = Image.new("RGB", (cw, ch), (48, 48, 52))
        tile.paste(thumb, ((cw - thumb.size[0]) // 2, (ch - thumb.size[1]) // 2))
        grid.paste(tile, (x0, y0))
        tag = {"canvas_ok": "OK", "canvas_sim": "SIM", "needs_gen_ai": "GEN"}[realism]
        d.text((x0 + 4, y0 + ch + 4), f"[{tag}] {label[:42]}", fill=(220, 220, 225), font=FONT_XS)
    return grid


def process_image(entry: dict, manifest_out: list) -> None:
    image_id = entry["id"]
    src_path = SOURCES_DIR / f"{image_id}.jpg"
    if not src_path.exists():
        import urllib.request

        urllib.request.urlretrieve(entry["download_url"], src_path)
    src = Image.open(src_path).convert("RGB")
    cutout = get_cutout(image_id, src)
    angles = all_angle_labels()

    for purpose, pack_id, pack_title, frames in iter_all_packages():
        labels = build_output_list(frames, angles)
        cells: list[tuple[str, Image.Image, str]] = []
        for label in labels:
            spec = frame_spec(label)
            img = render_frame(cutout, purpose, spec)
            cells.append((label, img, spec.realism))

        title = f"{image_id} · {purpose}/{pack_id} · {len(labels)} frames (all angles)"
        grid = build_package_grid(cells, title)
        rel = f"{OUT_SUB}/grids/{image_id}__{purpose}__{pack_id}.jpg"
        commit_p, art_p = save_dual(rel, grid)
        manifest_out.append(
            {
                "image_id": image_id,
                "purpose": purpose,
                "pack_id": pack_id,
                "pack_title": pack_title,
                "frame_count": len(labels),
                "commit_path": commit_p,
                "artifact_path": art_p,
            }
        )
        print(f"  {purpose}/{pack_id}: {len(labels)} frames -> {art_p}")


def main() -> None:
    with MANIFEST.open() as f:
        manifest = json.load(f)
    if len(sys.argv) > 1:
        wanted = set(sys.argv[1:])
        manifest = [e for e in manifest if e["id"] in wanted]

    manifest_out: list[dict] = []
    for entry in manifest:
        print(f"=== {entry['id']} ===")
        process_image(entry, manifest_out)

    index_path = ROOT / "app_scenarios_index.json"
    index_path.write_text(json.dumps(manifest_out, indent=2))
    for dest in (
        IMAGES_DIR / OUT_SUB / "app_scenarios_index.json",
        ARTIFACTS / OUT_SUB / "app_scenarios_index.json",
    ):
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(json.dumps(manifest_out, indent=2))
    shutil.copy(index_path, ARTIFACTS / OUT_SUB / "app_scenarios_index.json")
    print("Wrote index:", index_path)


if __name__ == "__main__":
    main()
