#!/usr/bin/env python3
"""Build per-image scene comparison grids from existing scene outputs."""

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
IMAGES = ROOT / "images"
ARTIFACTS = Path("/opt/cursor/artifacts/provider-test")
RESULTS = json.loads((ROOT / "results.json").read_text())

FONT = None
for name in ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",):
    if Path(name).exists():
        from PIL import ImageFont

        FONT = ImageFont.truetype(name, 13)
        break
if FONT is None:
    from PIL import ImageFont

    FONT = ImageFont.load_default()

ORDER = [
    "dragon_canvas_marketplace",
    "dragon_canvas_live",
    "dragon_canvas_artistic",
    "fal_flux_scene",
    "replicate_flux_scene",
    "photoroom_ai_bg",
]
LABELS = {
    "dragon_canvas_marketplace": "Dragon canvas — marketplace",
    "dragon_canvas_live": "Dragon canvas — live",
    "dragon_canvas_artistic": "Dragon canvas — artistic",
    "fal_flux_scene": "fal.ai Flux (untested)",
    "replicate_flux_scene": "Replicate Flux (untested)",
    "photoroom_ai_bg": "Photoroom AI BG (untested)",
}


def build_grid(cells, cols=3):
    pad, lw, ch, cw = 8, 36, 480, 480
    rows = (len(cells) + cols - 1) // cols
    gw = cols * (cw + pad) + pad
    gh = rows * (ch + lw + pad) + pad
    grid = Image.new("RGB", (gw, gh), (30, 30, 32))
    d = ImageDraw.Draw(grid)
    for i, (title, im) in enumerate(cells):
        r, c = divmod(i, cols)
        x0, y0 = pad + c * (cw + pad), pad + r * (ch + lw + pad)
        thumb = im.copy()
        thumb.thumbnail((cw, ch), Image.Resampling.LANCZOS)
        tile = Image.new("RGB", (cw, ch), (50, 50, 54))
        tile.paste(thumb, ((cw - thumb.size[0]) // 2, (ch - thumb.size[1]) // 2))
        grid.paste(tile, (x0, y0))
        d.text((x0 + 6, y0 + ch + 6), title, fill=(220, 220, 225), font=FONT)
    return grid


for row in RESULTS:
    image_id = row["id"]
    cells = []
    for key in ORDER:
        p = IMAGES / "scenes" / f"{image_id}__{key}.jpg"
        if not p.exists():
            continue
        cells.append((LABELS.get(key, key), Image.open(p).convert("RGB")))
    if not cells:
        continue
    grid = build_grid(cells, cols=3)
    out_commit = IMAGES / "grids" / f"{image_id}__scene_comparison.jpg"
    out_art = ARTIFACTS / "grids" / f"{image_id}__scene_comparison.jpg"
    out_commit.parent.mkdir(parents=True, exist_ok=True)
    out_art.parent.mkdir(parents=True, exist_ok=True)
    grid.save(out_commit, quality=92)
    grid.save(out_art, quality=92)
    print(image_id, out_art)
