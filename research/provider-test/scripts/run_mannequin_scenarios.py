#!/usr/bin/env python3
"""
On-model / mannequin scenes: BiRefNet product cutout composited onto licensed stock photos.
Marks true virtual try-on as NEEDS GENERATIVE AI (no warp-to-body in free pipeline).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / "sources"
MANIFEST = SOURCES / "manifest.json"
STOCK_MANIFEST = SOURCES / "mannequin_stock.json"
IMAGES = ROOT / "images"
ARTIFACTS = Path("/opt/cursor/artifacts/provider-test")
OUT = "app-scenarios/mannequin"

for p in (IMAGES / OUT, ARTIFACTS / OUT, IMAGES / OUT / "stocks", ARTIFACTS / OUT / "stocks"):
    p.mkdir(parents=True, exist_ok=True)


def font(sz: int):
    p = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
    return ImageFont.truetype(str(p), sz) if p.exists() else ImageFont.load_default()


FONT_SM = font(13)
FONT_XS = font(11)


def save_dual(rel: str, img: Image.Image) -> tuple[str, str]:
    c = IMAGES / rel
    a = ARTIFACTS / rel
    c.parent.mkdir(parents=True, exist_ok=True)
    a.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(c, quality=90)
    img.convert("RGB").save(a, quality=90)
    return str(c), str(a)


def load_stock(stock_id: str, stocks: dict) -> Image.Image:
    entry = stocks[stock_id]
    path = IMAGES / OUT / "stocks" / f"{stock_id}.jpg"
    if not path.exists():
        import urllib.request

        urllib.request.urlretrieve(entry["download_url"], path)
        (ARTIFACTS / OUT / "stocks" / f"{stock_id}.jpg").write_bytes(path.read_bytes())
    return Image.open(path).convert("RGB")


def get_cutout(image_id: str, src: Image.Image) -> Image.Image:
    cache = IMAGES / "cutouts" / f"{image_id}.png"
    if cache.exists():
        return Image.open(cache).convert("RGBA")
    sys.path.insert(0, str(Path(__file__).parent))
    from run_benchmark import rembg_remove

    rgba = rembg_remove(src, "birefnet-general")
    cache.parent.mkdir(parents=True, exist_ok=True)
    (ARTIFACTS / "cutouts").mkdir(parents=True, exist_ok=True)
    rgba.save(cache)
    rgba.save(ARTIFACTS / "cutouts" / f"{image_id}.png")
    return rgba


def composite(
    bg: Image.Image,
    cutout: Image.Image,
    *,
    scale: float,
    cx: float,
    cy: float,
    realism: str,
    title: str,
) -> Image.Image:
    """Place cutout on background with shadow. cx/cy are 0..1 anchor on canvas."""
    W, H = bg.size
    layer = bg.convert("RGBA")
    prod = cutout.convert("RGBA")
    th = int(H * scale)
    th = max(40, min(th, int(H * 0.85)))
    r = th / prod.size[1]
    nw = max(1, int(prod.size[0] * r))
    prod = prod.resize((nw, th), Image.Resampling.LANCZOS)

    px = int(W * cx - nw / 2)
    py = int(H * cy - th / 2)
    px = max(0, min(px, W - nw))
    py = max(0, min(py, H - th))

    shadow = Image.new("RGBA", prod.size, (0, 0, 0, 0))
    shadow.putalpha(prod.split()[-1].point(lambda a: int(a * 0.35)))
    shadow = shadow.filter(ImageFilter.GaussianBlur(12))

    out = layer.copy()
    out.paste(shadow, (px + 12, py + 16), shadow)
    out.paste(prod, (px, py), prod)
    d = ImageDraw.Draw(out)
    if realism == "needs_gen_ai":
        d.rectangle((0, 0, W, 46), fill=(110, 28, 28, 220))
        d.text((12, 12), "NEEDS GENERATIVE AI / VTON — flat composite only", fill=(255, 220, 220), font=FONT_SM)
    else:
        d.rectangle((0, H - 38, W, H), fill=(0, 0, 0, 170))
        d.text((12, H - 28), "Canvas composite (stock bg + cutout + shadow)", fill=(230, 230, 230), font=FONT_XS)
    d.text((12, 52 if realism == "needs_gen_ai" else 12), title[:70], fill=(255, 255, 255), font=FONT_XS)
    return out.convert("RGB")


# scenario_id -> stock_id, placement, realism, title template
SCENARIOS_BY_PRODUCT: dict[str, list[dict]] = {
    "easy-01-red-sneaker": [
        {
            "id": "shoe_on_feet",
            "stock": "feet_pavement",
            "scale": 0.22,
            "cx": 0.52,
            "cy": 0.78,
            "realism": "needs_gen_ai",
            "title": "Worn shot — shoe on feet (needs VTON/warp)",
        },
        {
            "id": "ghost_mannequin",
            "stock": "dress_mannequin",
            "scale": 0.28,
            "cx": 0.5,
            "cy": 0.55,
            "realism": "canvas_sim",
            "title": "Ghost mannequin stand-in — product on form (not hollow-neck CGI)",
        },
        {
            "id": "model_holding",
            "stock": "shopping_model",
            "scale": 0.2,
            "cx": 0.62,
            "cy": 0.48,
            "realism": "needs_gen_ai",
            "title": "On-model holding — needs pose-aware gen AI",
        },
    ],
    "easy-02-watch-plain": [
        {
            "id": "watch_on_wrist",
            "stock": "wrist_watch_stock",
            "scale": 0.18,
            "cx": 0.48,
            "cy": 0.55,
            "realism": "needs_gen_ai",
            "title": "Watch on wrist — needs VTON / inpaint strap",
        },
        {
            "id": "ghost_mannequin",
            "stock": "dress_mannequin",
            "scale": 0.15,
            "cx": 0.5,
            "cy": 0.42,
            "realism": "canvas_sim",
            "title": "Display on mannequin bust (flat composite)",
        },
    ],
    "normal-01-skincare-tile": [
        {
            "id": "product_in_hand",
            "stock": "hand_beauty",
            "scale": 0.25,
            "cx": 0.55,
            "cy": 0.62,
            "realism": "needs_gen_ai",
            "title": "Bottle in hand — needs grasp inpainting",
        },
        {
            "id": "on_model_torso",
            "stock": "fashion_model_studio",
            "scale": 0.18,
            "cx": 0.5,
            "cy": 0.45,
            "realism": "canvas_sim",
            "title": "Product near model torso (marketing composite)",
        },
    ],
    "normal-02-shoes-fabric": [
        {
            "id": "shoe_on_feet",
            "stock": "feet_pavement",
            "scale": 0.24,
            "cx": 0.5,
            "cy": 0.8,
            "realism": "needs_gen_ai",
            "title": "Worn sneakers — needs VTON",
        },
        {
            "id": "ghost_mannequin",
            "stock": "dress_mannequin",
            "scale": 0.3,
            "cx": 0.48,
            "cy": 0.58,
            "realism": "canvas_sim",
            "title": "Pair display on boutique form",
        },
    ],
    "hard-01-perfume-glass": [
        {
            "id": "perfume_in_hand",
            "stock": "hand_beauty",
            "scale": 0.22,
            "cx": 0.58,
            "cy": 0.58,
            "realism": "needs_gen_ai",
            "title": "Perfume in hand — needs finger wrap / gen AI",
        },
        {
            "id": "on_model_torso",
            "stock": "shopping_model",
            "scale": 0.16,
            "cx": 0.45,
            "cy": 0.5,
            "realism": "canvas_sim",
            "title": "Hero bottle near model (flat composite)",
        },
    ],
    "hard-02-white-sneaker-white": [
        {
            "id": "shoe_on_feet",
            "stock": "feet_pavement",
            "scale": 0.23,
            "cx": 0.54,
            "cy": 0.77,
            "realism": "needs_gen_ai",
            "title": "White sneaker on feet — needs VTON",
        },
    ],
    "veryhard-01-lace-dress": [
        {
            "id": "dress_on_model",
            "stock": "fashion_model_studio",
            "scale": 0.55,
            "cx": 0.5,
            "cy": 0.52,
            "realism": "needs_gen_ai",
            "title": "Dress on model — needs garment VTON (warp/drape)",
        },
        {
            "id": "ghost_mannequin_dress",
            "stock": "dress_mannequin",
            "scale": 0.5,
            "cx": 0.5,
            "cy": 0.5,
            "realism": "needs_gen_ai",
            "title": "Ghost mannequin dress — needs hollow-neck inpainting",
        },
    ],
    "veryhard-02-cat-fur": [
        {
            "id": "not_wearable",
            "stock": "fashion_model_studio",
            "scale": 0.35,
            "cx": 0.7,
            "cy": 0.55,
            "realism": "canvas_sim",
            "title": "Pet subject — no wear scenario; cutout beside model (demo only)",
        },
    ],
}


def build_grid(image_id: str, cells: list[tuple[str, Image.Image]]) -> Image.Image:
    cols = min(3, len(cells))
    pad, lw, cw, ch = 8, 40, 420, 420
    rows = (len(cells) + cols - 1) // cols
    gw = cols * (cw + pad) + pad
    gh = rows * (ch + lw + pad) + pad + 32
    g = Image.new("RGB", (gw, gh), (22, 22, 24))
    d = ImageDraw.Draw(g)
    d.text((pad, 6), f"{image_id} — mannequin / on-model composites", fill=(180, 255, 140), font=FONT_SM)
    for i, (label, im) in enumerate(cells):
        r, c = divmod(i, cols)
        x0, y0 = pad + c * (cw + pad), pad + 28 + r * (ch + lw + pad)
        t = im.copy()
        t.thumbnail((cw, ch), Image.Resampling.LANCZOS)
        tile = Image.new("RGB", (cw, ch), (40, 40, 44))
        tile.paste(t, ((cw - t.size[0]) // 2, (ch - t.size[1]) // 2))
        g.paste(tile, (x0, y0))
        d.text((x0 + 4, y0 + ch + 6), label[:55], fill=(220, 220, 225), font=FONT_XS)
    return g


def main() -> None:
    with MANIFEST.open() as f:
        products = json.load(f)
    with STOCK_MANIFEST.open() as f:
        stock_list = json.load(f)
    stocks = {s["id"]: s for s in stock_list}

    if len(sys.argv) > 1:
        wanted = set(sys.argv[1:])
        products = [p for p in products if p["id"] in wanted]

    index: list[dict] = []
    for entry in products:
        image_id = entry["id"]
        print("===", image_id)
        src_path = SOURCES / f"{image_id}.jpg"
        src = Image.open(src_path).convert("RGB")
        cutout = get_cutout(image_id, src)
        scenarios = SCENARIOS_BY_PRODUCT.get(image_id, [])
        cells: list[tuple[str, Image.Image]] = []

        for sc in scenarios:
            bg = load_stock(sc["stock"], stocks)
            img = composite(
                bg,
                cutout,
                scale=sc["scale"],
                cx=sc["cx"],
                cy=sc["cy"],
                realism=sc["realism"],
                title=sc["title"],
            )
            rel = f"{OUT}/{image_id}__{sc['id']}.jpg"
            c_p, a_p = save_dual(rel, img)
            cells.append((sc["id"], img))
            index.append(
                {
                    "image_id": image_id,
                    "scenario_id": sc["id"],
                    "realism": sc["realism"],
                    "stock_id": sc["stock"],
                    "commit_path": c_p,
                    "artifact_path": a_p,
                }
            )

        if cells:
            grid = build_grid(image_id, cells)
            gc, ga = save_dual(f"{OUT}/grids/{image_id}__mannequin_grid.jpg", grid)
            index.append(
                {
                    "image_id": image_id,
                    "scenario_id": "_grid",
                    "commit_path": gc,
                    "artifact_path": ga,
                }
            )

    out_json = ROOT / "mannequin_scenarios_index.json"
    out_json.write_text(json.dumps(index, indent=2))
    for dest in (IMAGES / OUT / "mannequin_index.json", ARTIFACTS / OUT / "mannequin_index.json"):
        dest.write_text(json.dumps(index, indent=2))
    print("Index:", out_json)


if __name__ == "__main__":
    main()
