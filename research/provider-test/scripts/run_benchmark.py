#!/usr/bin/env python3
"""Dragon Studio provider benchmark — dekupe, Dragon pipelines, scenes, grids."""

from __future__ import annotations

import json
import shutil
import time
from dataclasses import dataclass, field
from io import BytesIO
from pathlib import Path
from typing import Callable

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCES_DIR = ROOT / "sources"
IMAGES_DIR = ROOT / "images"
ARTIFACTS = Path("/opt/cursor/artifacts/provider-test")
MANIFEST = SOURCES_DIR / "manifest.json"

# Commit paths mirror artifacts layout
for sub in ("sources", "dekupe", "scenes", "grids"):
    (IMAGES_DIR / sub).mkdir(parents=True, exist_ok=True)
ARTIFACTS.mkdir(parents=True, exist_ok=True)
for sub in ("sources", "dekupe", "scenes", "grids"):
    (ARTIFACTS / sub).mkdir(parents=True, exist_ok=True)


def load_font(size: int = 14) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for name in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ):
        p = Path(name)
        if p.exists():
            return ImageFont.truetype(str(p), size=size)
    return ImageFont.load_default()


FONT_SM = load_font(13)
FONT_LG = load_font(16)


def checkerboard(size: tuple[int, int], cell: int = 16) -> Image.Image:
    w, h = size
    arr = np.zeros((h, w, 3), dtype=np.uint8)
    for y in range(0, h, cell):
        for x in range(0, w, cell):
            c = 220 if ((x // cell) + (y // cell)) % 2 == 0 else 180
            arr[y : y + cell, x : x + cell] = c
    return Image.fromarray(arr, "RGB")


def paste_rgba_on_checker(rgba: Image.Image, max_side: int = 512) -> Image.Image:
    rgba = rgba.convert("RGBA")
    w, h = rgba.size
    scale = min(1.0, max_side / max(w, h))
    if scale < 1.0:
        nw, nh = int(w * scale), int(h * scale)
        rgba = rgba.resize((nw, nh), Image.Resampling.LANCZOS)
    bg = checkerboard(rgba.size)
    bg.paste(rgba, (0, 0), rgba)
    return bg


def pil_to_cv(img: Image.Image) -> np.ndarray:
    return cv2.cvtColor(np.array(img.convert("RGB")), cv2.COLOR_RGB2BGR)


def cv_to_pil(bgr: np.ndarray) -> Image.Image:
    return Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))


def save_dual(path_rel: str, img: Image.Image) -> tuple[str, str]:
    """Save to images/ (git) and artifacts/ (delivery). Returns both absolute paths."""
    rel = Path(path_rel)
    commit_path = IMAGES_DIR / rel
    artifact_path = ARTIFACTS / rel
    commit_path.parent.mkdir(parents=True, exist_ok=True)
    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(commit_path, quality=92 if rel.suffix.lower() in {".jpg", ".jpeg"} else None)
    img.save(artifact_path, quality=92 if rel.suffix.lower() in {".jpg", ".jpeg"} else None)
    return str(commit_path), str(artifact_path)


@dataclass
class Timing:
    seconds: float


@dataclass
class DekupeResult:
    label: str
    image: Image.Image | None
    note: str
    timing: float | None = None
    tested: bool = True


def dragon_live_today(src: Image.Image, frame_index: int = 0) -> Image.Image:
    """Mirrors live studio: square tile, object-cover center crop, no dekupe."""
    w, h = src.size
    side = min(w, h)
    # Slight variation by frame index mimics future per-frame crop (still no AI)
    shift = (frame_index % 5) * 0.02
    cx = w * (0.5 + shift * 0.1)
    cy = h * (0.5 - shift * 0.05)
    left = int(max(0, min(w - side, cx - side / 2)))
    top = int(max(0, min(h - side, cy - side / 2)))
    crop = src.crop((left, top, left + side, top + side))
    out = crop.resize((512, 512), Image.Resampling.LANCZOS)
    return out.convert("RGB")


def extract_mask_rgba(rgba: Image.Image) -> np.ndarray:
    return np.array(rgba.split()[-1], dtype=np.float32) / 255.0


def apply_mask_rgb(src: Image.Image, mask: np.ndarray) -> Image.Image:
    rgb = np.array(src.convert("RGB"), dtype=np.float32)
    m = np.clip(mask, 0, 1)
    if m.ndim == 2:
        m = m[..., None]
    alpha = (m * 255).astype(np.uint8)
    out = np.dstack([rgb.astype(np.uint8), alpha])
    return Image.fromarray(out, "RGBA")


def morph_hole_fill(mask: np.ndarray, close_px: int = 5) -> np.ndarray:
    m = (mask > 0.5).astype(np.uint8) * 255
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (close_px, close_px))
    closed = cv2.morphologyEx(m, cv2.MORPH_CLOSE, k)
    opened = cv2.morphologyEx(closed, cv2.MORPH_OPEN, k)
    blurred = cv2.GaussianBlur(opened, (5, 5), 0)
    return blurred.astype(np.float32) / 255.0


def hybrid_mask(m1: np.ndarray, m2: np.ndarray) -> np.ndarray:
    """Union with bias toward sharper interior (min of inverted = intersection soft)."""
    return np.clip(np.maximum(m1, m2) * 0.85 + np.minimum(m1, m2) * 0.15, 0, 1)


def refine_alpha_edges(src: Image.Image, mask: np.ndarray, erode_size: int = 10) -> np.ndarray:
    """Light alpha matting-style refinement using guided blur on uncertain band."""
    m = np.clip(mask, 0, 1)
    hard = (m > 0.9).astype(np.float32)
    soft = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 1.2)
    band = (m > 0.05) & (m < 0.95)
    out = m.copy()
    out[band] = soft[band] * 0.7 + m[band] * 0.3
    # Feather outer edge
    out = cv2.GaussianBlur(out, (3, 3), 0)
    return np.clip(out, 0, 1)


MAX_INFER_PX = 768  # keep ONNX peak RAM under cloud-agent limit


def resize_for_infer(src: Image.Image, max_px: int = MAX_INFER_PX) -> tuple[Image.Image, float]:
    w, h = src.size
    scale = min(1.0, max_px / max(w, h))
    if scale >= 1.0:
        return src, 1.0
    nw, nh = int(w * scale), int(h * scale)
    return src.resize((nw, nh), Image.Resampling.LANCZOS), scale


def upscale_rgba(rgba: Image.Image, target_size: tuple[int, int]) -> Image.Image:
    if rgba.size == target_size:
        return rgba
    return rgba.resize(target_size, Image.Resampling.LANCZOS)


def rembg_remove(src: Image.Image, model: str, alpha_matting: bool = False) -> Image.Image:
    import gc
    from rembg import remove, new_session

    infer_src, scale = resize_for_infer(src)
    session = new_session(model)
    buf = BytesIO()
    infer_src.convert("RGB").save(buf, format="PNG")
    kwargs = {}
    if alpha_matting:
        kwargs = {
            "alpha_matting": True,
            "alpha_matting_foreground_threshold": 240,
            "alpha_matting_background_threshold": 10,
            "alpha_matting_erode_size": 10,
        }
    out = remove(buf.getvalue(), session=session, **kwargs)
    rgba = Image.open(BytesIO(out)).convert("RGBA")
    del session
    gc.collect()
    if scale < 1.0:
        rgba = upscale_rgba(rgba, src.size)
    return rgba


def untested_tile(label: str, reason: str, size: tuple[int, int] = (512, 512)) -> Image.Image:
    img = Image.new("RGB", size, (45, 45, 48))
    d = ImageDraw.Draw(img)
    d.rectangle((8, 8, size[0] - 8, size[1] - 8), outline=(120, 120, 125), width=2)
    d.text((20, size[1] // 2 - 28), label, fill=(200, 200, 205), font=FONT_LG)
    d.text((20, size[1] // 2 + 4), reason, fill=(150, 150, 155), font=FONT_SM)
    return img


def compose_scene_marketplace(cutout: Image.Image) -> Image.Image:
    """Canvas scene: soft gray studio gradient + drop shadow."""
    W, H = 1024, 1024
    base = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(base)
    for y in range(H):
        t = y / H
        c = int(248 - t * 18)
        draw.line([(0, y), (W, y)], fill=(c, c, c + 2))
    rgba = cutout.convert("RGBA")
    max_h = int(H * 0.72)
    scale = max_h / rgba.size[1]
    nw = int(rgba.size[0] * scale)
    nh = int(rgba.size[1] * scale)
    prod = rgba.resize((nw, nh), Image.Resampling.LANCZOS)
    x = (W - nw) // 2
    y = H - nh - int(H * 0.08)
    shadow = Image.new("RGBA", (nw, nh), (0, 0, 0, 0))
    alpha = prod.split()[-1]
    shadow.putalpha(alpha.point(lambda a: int(a * 0.35)))
    shadow = shadow.filter(ImageFilter.GaussianBlur(12))
    base_rgba = base.convert("RGBA")
    base_rgba.paste(shadow, (x + 18, y + 22), shadow)
    base_rgba.paste(prod, (x, y), prod)
    return base_rgba.convert("RGB")


def compose_scene_live(cutout: Image.Image) -> Image.Image:
    """Live-sales vibe: warm gradient + product hero."""
    W, H = 1080, 1080
    arr = np.zeros((H, W, 3), dtype=np.uint8)
    for y in range(H):
        t = y / H
        arr[y, :] = [int(255 - t * 40), int(230 - t * 50), int(210 - t * 30)]
    base = Image.fromarray(arr, "RGB")
    rgba = cutout.convert("RGBA")
    scale = (H * 0.65) / rgba.size[1]
    prod = rgba.resize((int(rgba.size[0] * scale), int(rgba.size[1] * scale)), Image.Resampling.LANCZOS)
    layer = base.convert("RGBA")
    px = (W - prod.size[0]) // 2
    py = int(H * 0.22)
    layer.paste(prod, (px, py), prod)
    draw = ImageDraw.Draw(layer)
    draw.rounded_rectangle((40, H - 120, W - 40, H - 50), radius=28, fill=(0, 0, 0, 160))
    draw.text((60, H - 102), "LIVE — Shop now", fill=(255, 255, 255), font=FONT_LG)
    return layer.convert("RGB")


def compose_scene_artistic(cutout: Image.Image) -> Image.Image:
    W, H = 1024, 1280
    arr = np.zeros((H, W, 3), dtype=np.uint8)
    for y in range(H):
        t = y / H
        arr[y, :] = [int(20 + t * 30), int(25 + t * 20), int(45 + t * 80)]
    base = Image.fromarray(arr, "RGB").convert("RGBA")
    rgba = cutout.convert("RGBA")
    scale = (H * 0.55) / rgba.size[1]
    prod = rgba.resize((int(rgba.size[0] * scale), int(rgba.size[1] * scale)), Image.Resampling.LANCZOS)
    base.paste(prod, ((W - prod.size[0]) // 2, int(H * 0.18)), prod)
    return base.convert("RGB")


def build_grid(cells: list[tuple[str, Image.Image]], cols: int = 4) -> Image.Image:
    pad = 8
    label_h = 36
    cw, ch = 520, 520
    rows = (len(cells) + cols - 1) // cols
    gw = cols * (cw + pad) + pad
    gh = rows * (ch + label_h + pad) + pad
    grid = Image.new("RGB", (gw, gh), (30, 30, 32))
    d = ImageDraw.Draw(grid)
    for i, (title, im) in enumerate(cells):
        r, c = divmod(i, cols)
        x0 = pad + c * (cw + pad)
        y0 = pad + r * (ch + label_h + pad)
        thumb = im.copy()
        thumb.thumbnail((cw, ch), Image.Resampling.LANCZOS)
        tile = Image.new("RGB", (cw, ch), (50, 50, 54))
        ox = (cw - thumb.size[0]) // 2
        oy = (ch - thumb.size[1]) // 2
        tile.paste(thumb, (ox, oy))
        grid.paste(tile, (x0, y0))
        d.text((x0 + 6, y0 + ch + 6), title, fill=(220, 220, 225), font=FONT_SM)
    return grid


@dataclass
class ImageReport:
    id: str
    difficulty: str
    dekupe: dict = field(default_factory=dict)
    scenes: dict = field(default_factory=dict)
    grid_commit: str = ""
    grid_artifact: str = ""


def quality_notes(difficulty: str, label: str) -> str:
    """Short heuristic after visual pass — filled in report manually where needed."""
    return ""


def run_dekupe_battery(src: Image.Image, image_id: str) -> list[DekupeResult]:
    results: list[DekupeResult] = []

    t0 = time.perf_counter()
    results.append(
        DekupeResult(
            "Source",
            src.convert("RGB"),
            "Original upload",
            time.perf_counter() - t0,
        )
    )

    t0 = time.perf_counter()
    live = dragon_live_today(src, frame_index=hash(image_id) % 7)
    results.append(
        DekupeResult(
            "Dragon live (today)",
            live,
            "Square object-cover crop; no background removal (matches studio placeholder)",
            time.perf_counter() - t0,
        )
    )

    # BiRefNet default
    t0 = time.perf_counter()
    try:
        biref = rembg_remove(src, "birefnet-general", alpha_matting=False)
        dt = time.perf_counter() - t0
        results.append(DekupeResult("BiRefNet (local MIT)", biref, "rembg birefnet-general", dt))
        results.append(
            DekupeResult(
                "Dragon BiRefNet default",
                biref,
                "Same model — self-hostable stack baseline",
                dt,
            )
        )
        mask_b = extract_mask_rgba(biref)

        t1 = time.perf_counter()
        refined_mask = refine_alpha_edges(src, mask_b)
        mat = apply_mask_rgb(src, refined_mask)
        results.append(
            DekupeResult(
                "Dragon BiRefNet + matting",
                mat,
                "Edge-band refinement on BiRefNet mask (self-host matting-lite)",
                time.perf_counter() - t1,
            )
        )

        t1 = time.perf_counter()
        isnet = rembg_remove(src, "isnet-general-use", alpha_matting=False)
        mask_i = extract_mask_rgba(isnet)
        results.append(
            DekupeResult(
                "ISNet (local)",
                isnet,
                "rembg isnet-general-use",
                time.perf_counter() - t1,
            )
        )
        hybrid = apply_mask_rgb(src, hybrid_mask(mask_b, mask_i))
        results.append(
            DekupeResult(
                "Dragon BiRefNet+ISNet hybrid",
                hybrid,
                "max-blend masks from birefnet-general + isnet-general-use",
                time.perf_counter() - t1,
            )
        )

        t1 = time.perf_counter()
        filled = apply_mask_rgb(src, morph_hole_fill(mask_b))
        results.append(
            DekupeResult(
                "Dragon hole-fill",
                filled,
                "Morph close/open on BiRefNet mask",
                time.perf_counter() - t1,
            )
        )
    except Exception as e:
        results.append(DekupeResult("BiRefNet (local MIT)", None, f"FAILED: {e}", None, tested=False))

    # External — no API keys in this run
    external = [
        ("fal.ai BiRefNet", "FAL_KEY not set — paid API"),
        ("Photoroom", "No API key / no public batch API on free tier"),
        ("remove.bg", "API key required (50 free preview credits with signup)"),
        ("Clipdrop", "API key required"),
        ("Claid.ai", "API key required"),
        ("Pixelcut", "No documented free API; web app only"),
    ]
    for name, reason in external:
        results.append(DekupeResult(name, untested_tile(name, reason), reason, None, tested=False))

    return results


def process_one(entry: dict, all_metrics: list, artifact_index: list) -> None:
    image_id = entry["id"]
    print(f"=== {image_id} ===")
    src_path = SOURCES_DIR / f"{image_id}.jpg"
    if not src_path.exists():
        import urllib.request

        urllib.request.urlretrieve(entry["download_url"], src_path)
    src = Image.open(src_path).convert("RGB")
    save_dual(f"sources/{image_id}.jpg", src)

    dekupe_results = run_dekupe_battery(src, image_id)
    grid_cells: list[tuple[str, Image.Image]] = []
    row_metrics: dict = {"id": image_id, "difficulty": entry["difficulty"], "providers": {}}

    best_cutout: Image.Image | None = None
    best_label = "Dragon BiRefNet default"

    for dr in dekupe_results:
        key = dr.label.replace("/", "-").replace(" ", "_").lower()
        if dr.image is None:
            continue
        if dr.label in ("Source", "Dragon live (today)") or not dr.tested:
            vis = dr.image
        else:
            vis = paste_rgba_on_checker(dr.image) if dr.image.mode == "RGBA" else dr.image

        rel = f"dekupe/{image_id}__{key}.png"
        commit_p, art_p = save_dual(rel, vis)
        row_metrics["providers"][dr.label] = {
            "tested": dr.tested,
            "seconds": dr.timing,
            "note": dr.note,
            "commit_path": commit_p,
            "artifact_path": art_p,
        }
        grid_cells.append((dr.label, vis))

        if dr.label == best_label and dr.image is not None and dr.tested:
            best_cutout = dr.image

    if best_cutout is None:
        for dr in dekupe_results:
            if dr.tested and dr.image is not None and dr.image.mode == "RGBA":
                best_cutout = dr.image
                break

    grid = build_grid(grid_cells, cols=4)
    g_commit, g_art = save_dual(f"grids/{image_id}__dekupe_comparison.png", grid)

    scene_metrics: dict = {}
    if best_cutout is not None:
        scenes = [
            ("dragon_canvas_marketplace", compose_scene_marketplace(best_cutout)),
            ("dragon_canvas_live", compose_scene_live(best_cutout)),
            ("dragon_canvas_artistic", compose_scene_artistic(best_cutout)),
            ("fal_flux_scene", untested_tile("fal.ai Flux", "FAL_KEY not set")),
            ("replicate_flux_scene", untested_tile("Replicate Flux", "No REPLICATE_API_TOKEN")),
            ("photoroom_ai_bg", untested_tile("Photoroom AI BG", "API key required")),
        ]
        for sname, simg in scenes:
            rel = f"scenes/{image_id}__{sname}.jpg"
            c_p, a_p = save_dual(rel, simg.convert("RGB"))
            scene_metrics[sname] = {"commit_path": c_p, "artifact_path": a_p}

    row_metrics["grid"] = {"commit_path": g_commit, "artifact_path": g_art}
    row_metrics["scenes"] = scene_metrics
    all_metrics.append(row_metrics)
    artifact_index.append(
        {
            "image_id": image_id,
            "comparison_grid_artifact": g_art,
            "comparison_grid_commit": g_commit,
            "scenes": [v["artifact_path"] for v in scene_metrics.values()],
        }
    )


def main() -> None:
    import sys

    with MANIFEST.open() as f:
        manifest = json.load(f)

    if len(sys.argv) > 1:
        wanted = set(sys.argv[1:])
        manifest = [e for e in manifest if e["id"] in wanted]

    metrics_path = ROOT / "results.json"
    all_metrics: list[dict] = []
    if metrics_path.exists():
        all_metrics = json.loads(metrics_path.read_text())
        all_metrics = [m for m in all_metrics if m["id"] not in {e["id"] for e in manifest}]
    index_path = ROOT / "artifact_index.json"
    artifact_index: list[dict] = []
    if index_path.exists():
        artifact_index = json.loads(index_path.read_text())
        artifact_index = [
            a for a in artifact_index if a["image_id"] not in {e["id"] for e in manifest}
        ]

    for entry in manifest:
        process_one(entry, all_metrics, artifact_index)

    metrics_path.write_text(json.dumps(all_metrics, indent=2))
    shutil.copy(metrics_path, ARTIFACTS / "results.json")
    index_path.write_text(json.dumps(artifact_index, indent=2))
    shutil.copy(ROOT / "artifact_index.json", ARTIFACTS / "artifact_index.json")
    print("Done. Metrics:", metrics_path)


if __name__ == "__main__":
    main()
