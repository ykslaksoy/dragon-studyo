#!/usr/bin/env python3
"""Generate worn / in-use product shots with occlusion-aware perspective warp."""

from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from wear_engine import warp_wear

SOURCES = ROOT / "sources"
STOCK_MANIFEST = SOURCES / "mannequin_stock.json"
IMAGES = ROOT / "images"
ARTIFACTS = Path("/opt/cursor/artifacts/provider-test")
OUT = "app-scenarios/mannequin"

# image_id, placement_key, stock_id, output_suffix
JOBS = [
    ("easy-01-red-sneaker", "shoe_worn", "fitness_worn_gear", "shoe_on_feet"),
    ("normal-02-shoes-fabric", "shoe_worn", "fitness_worn_gear", "shoe_on_feet"),
    ("hard-02-white-sneaker-white", "shoe_worn", "fitness_worn_gear", "shoe_on_feet"),
    ("easy-02-watch-plain", "watch_worn", "fitness_worn_gear", "watch_on_wrist"),
    ("normal-01-skincare-tile", "product_in_hand", "hand_beauty", "product_in_hand"),
    ("hard-01-perfume-glass", "perfume_in_hand", "hand_beauty", "perfume_in_hand"),
    ("veryhard-01-lace-dress", "dress_worn", "fashion_model_studio", "dress_on_model"),
]


def font(sz: int):
    p = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
    return ImageFont.truetype(str(p), sz) if p.exists() else ImageFont.load_default()


FONT_SM = font(12)


def save_dual(rel: str, img: Image.Image) -> tuple[str, str]:
    c, a = IMAGES / rel, ARTIFACTS / rel
    c.parent.mkdir(parents=True, exist_ok=True)
    a.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(c, quality=92)
    img.convert("RGB").save(a, quality=92)
    return str(c), str(a)


def load_stock(stock_id: str, stocks: dict) -> Image.Image:
    path = IMAGES / OUT / "stocks" / f"{stock_id}.jpg"
    entry = stocks[stock_id]
    if not path.exists():
        urllib.request.urlretrieve(entry["download_url"], path)
        (ARTIFACTS / OUT / "stocks" / f"{stock_id}.jpg").parent.mkdir(parents=True, exist_ok=True)
        (ARTIFACTS / OUT / "stocks" / f"{stock_id}.jpg").write_bytes(path.read_bytes())
    return Image.open(path).convert("RGB")


def get_cutout(image_id: str) -> Image.Image:
    p = IMAGES / "cutouts" / f"{image_id}.png"
    return Image.open(p).convert("RGBA")


def label(img: Image.Image, text: str) -> Image.Image:
    out = img.convert("RGBA")
    d = ImageDraw.Draw(out)
    d.rectangle((0, 0, out.size[0], 44), fill=(20, 20, 24, 220))
    d.text((12, 12), text, fill=(220, 255, 200), font=FONT_SM)
    return out.convert("RGB")


def thumb(im: Image.Image, cw: int, ch: int) -> Image.Image:
    t = im.copy()
    t.thumbnail((cw, ch), Image.Resampling.LANCZOS)
    tile = Image.new("RGB", (cw, ch), (40, 40, 44))
    tile.paste(t, ((cw - t.size[0]) // 2, (ch - t.size[1]) // 2))
    return tile


def build_grid(image_id: str, stock: Image.Image, worn: Image.Image, cut: Image.Image) -> Image.Image:
    pad, cw, ch = 8, 420, 420
    cells = [
        ("Licensed stock", stock),
        ("Worn / in-use (occlusion warp)", worn),
        ("Product cutout", cut.convert("RGB")),
    ]
    cols = 3
    g = Image.new("RGB", (cols * (cw + pad) + pad, ch + pad + 56), (18, 18, 20))
    d = ImageDraw.Draw(g)
    d.text((pad, 8), f"{image_id} — mannequin wear benchmark", fill=(180, 255, 140), font=FONT_SM)
    for i, (name, im) in enumerate(cells):
        x0 = pad + i * (cw + pad)
        y0 = pad + 32
        g.paste(thumb(im, cw, ch), (x0, y0))
        d.text((x0 + 4, y0 + ch + 6), name[:52], fill=(220, 220, 225), font=font(11))
    return g


def main() -> None:
    stocks = {s["id"]: s for s in json.loads(STOCK_MANIFEST.read_text())}
    index: list[dict] = []
    by_image: dict[str, tuple[Image.Image, Image.Image, Image.Image]] = {}

    for image_id, place_key, stock_id, out_name in JOBS:
        print(image_id, out_name, stock_id)
        bg = load_stock(stock_id, stocks)
        cut = get_cutout(image_id)
        worn = warp_wear(bg, cut, stock_id, place_key)
        worn_l = label(
            worn,
            "Giyili/kullanım — perspektif warp + ön plan occlusion (VTON API yok)",
        )
        rel = f"{OUT}/{image_id}__{out_name}.jpg"
        c_p, a_p = save_dual(rel, worn_l)
        index.append(
            {
                "image_id": image_id,
                "scenario": out_name,
                "stock_id": stock_id,
                "method": "occlusion_warp_v3",
                "artifact_path": a_p,
            }
        )
        by_image[image_id] = (bg, worn_l, cut)

    for image_id, (stock, worn, cut) in by_image.items():
        grid = build_grid(image_id, stock, worn, cut)
        gc, ga = save_dual(f"{OUT}/grids/{image_id}__mannequin_grid.jpg", grid)
        index.append({"image_id": image_id, "scenario": "_grid", "artifact_path": ga})

    out = ROOT / "worn_products_index.json"
    out.write_text(json.dumps(index, indent=2))
    (ARTIFACTS / OUT / "worn_products_index.json").write_text(json.dumps(index, indent=2))
    print("Wrote", out)


if __name__ == "__main__":
    main()
