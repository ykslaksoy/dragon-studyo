#!/usr/bin/env python3
"""
On-model / mannequin scenes: BiRefNet product cutout composited onto licensed stock photos.
Marks true virtual try-on as NEEDS GENERATIVE AI (no warp-to-body in free pipeline).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from composite_utils import composite_overlay, composite_pedestal, load_font as cu_font

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


def annotate(out: Image.Image, realism: str, title: str) -> Image.Image:
    W, H = out.size
    d = ImageDraw.Draw(out)
    if realism == "needs_gen_ai":
        d.rectangle((0, 0, W, 50), fill=(110, 28, 28))
        d.text(
            (12, 10),
            "Gerçek try-on / el / ayak için üretken AI (VTON) gerekir — bu önizleme vitrin",
            fill=(255, 220, 220),
            font=FONT_SM,
        )
    else:
        d.rectangle((0, H - 40, W, H), fill=(20, 20, 22))
        d.text((12, H - 28), "Stüdyo vitrin (ücretsiz pipeline)", fill=(210, 210, 210), font=FONT_XS)
    d.text((12, 54 if realism == "needs_gen_ai" else 10), title[:72], fill=(255, 255, 255), font=FONT_XS)
    return out


def render_scenario(bg: Image.Image, cutout: Image.Image, sc: dict) -> Image.Image:
    mode = sc.get("mode", "overlay")
    if mode == "pedestal":
        out = composite_pedestal(bg, cutout, scale=sc.get("scale", 0.4))
    else:
        out = composite_overlay(
            bg,
            cutout,
            scale=sc["scale"],
            cx=sc["cx"],
            cy=sc["cy"],
            rotate=sc.get("rotate", 0.0),
        )
    return annotate(out.convert("RGB"), sc["realism"], sc["title"])


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
            "mode": "pedestal",
            "scale": 0.38,
            "realism": "canvas_sim",
            "title": "Vitrin — ghost mannequin CGI yerine stüdyo pedestal",
        },
        {
            "id": "model_holding",
            "stock": "shopping_model",
            "mode": "pedestal",
            "scale": 0.36,
            "realism": "needs_gen_ai",
            "title": "Elde tutma sahnesi — VTON/inpaint gerekir (arka plan bulanık vitrin)",
        },
    ],
    "easy-02-watch-plain": [
        {
            "id": "watch_on_wrist",
            "stock": "wrist_watch_stock",
            "scale": 0.12,
            "cx": 0.42,
            "cy": 0.58,
            "rotate": -8,
            "realism": "needs_gen_ai",
            "title": "Bilekte saat — bileğe oturtma VTON ister (yaklaşık yerleşim)",
        },
        {
            "id": "ghost_mannequin",
            "stock": "dress_mannequin",
            "mode": "pedestal",
            "scale": 0.22,
            "realism": "canvas_sim",
            "title": "Saat vitrin — manken üstüne yapıştırma yok",
        },
    ],
    "normal-01-skincare-tile": [
        {
            "id": "product_in_hand",
            "stock": "hand_beauty",
            "scale": 0.14,
            "cx": 0.62,
            "cy": 0.68,
            "realism": "needs_gen_ai",
            "title": "Şişe elde — parmak kavrama üretken AI",
        },
        {
            "id": "on_model_torso",
            "stock": "fashion_model_studio",
            "mode": "pedestal",
            "scale": 0.34,
            "realism": "canvas_sim",
            "title": "Model arka planda blur — ürün ön vitrin",
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
            "mode": "pedestal",
            "scale": 0.4,
            "realism": "canvas_sim",
            "title": "Çift ayakkabı vitrin pedestal",
        },
    ],
    "hard-01-perfume-glass": [
        {
            "id": "perfume_in_hand",
            "stock": "hand_beauty",
            "scale": 0.13,
            "cx": 0.58,
            "cy": 0.72,
            "realism": "needs_gen_ai",
            "title": "Parfüm elde — gerçekçi kavrama VTON",
        },
        {
            "id": "on_model_torso",
            "stock": "shopping_model",
            "mode": "pedestal",
            "scale": 0.32,
            "realism": "canvas_sim",
            "title": "Live alışveriş mood — ürün önde, model blur",
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
            "mode": "pedestal",
            "scale": 0.48,
            "realism": "needs_gen_ai",
            "title": "Elbise modelde — kıyafet VTON şart; vitrin önizleme",
        },
        {
            "id": "ghost_mannequin_dress",
            "stock": "dress_mannequin",
            "mode": "pedestal",
            "scale": 0.45,
            "realism": "needs_gen_ai",
            "title": "Ghost mannequin — hollow-neck inpaint / Photoroom API",
        },
    ],
    "veryhard-02-cat-fur": [
        {
            "id": "not_wearable",
            "stock": "fashion_model_studio",
            "mode": "pedestal",
            "scale": 0.38,
            "realism": "canvas_sim",
            "title": "Pet ürün değil — stüdyo vitrin only",
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
            img = render_scenario(bg, cutout, sc)
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
