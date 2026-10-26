"""Perspective-warp wear compositing with foreground occlusion (no flat paste)."""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PLACEMENTS = json.loads((ROOT / "sources" / "wear_placements.json").read_text())


def _pil_to_bgra(im: Image.Image) -> np.ndarray:
    if im.mode == "RGBA":
        return cv2.cvtColor(np.array(im), cv2.COLOR_RGBA2BGRA)
    rgb = np.array(im.convert("RGB"))
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2BGRA)


def _bgra_to_pil(arr: np.ndarray) -> Image.Image:
    return Image.fromarray(cv2.cvtColor(arr, cv2.COLOR_BGRA2RGBA))


def _poly_mask(size: tuple[int, int], polygons: list[list[list[int]]]) -> np.ndarray:
    w, h = size
    mask = np.zeros((h, w), dtype=np.uint8)
    for poly in polygons:
        pts = np.array(poly, dtype=np.int32)
        cv2.fillPoly(mask, [pts], 255)
    return cv2.GaussianBlur(mask, (9, 9), 0)


def _shift_color(bgra: np.ndarray, shift: list[float]) -> np.ndarray:
    b, g, r, a = cv2.split(bgra)
    r = np.clip(r.astype(np.float32) * shift[0], 0, 255).astype(np.uint8)
    g = np.clip(g.astype(np.float32) * shift[1], 0, 255).astype(np.uint8)
    b = np.clip(b.astype(np.float32) * shift[2], 0, 255).astype(np.uint8)
    return cv2.merge([b, g, r, a])


def _match_lab_region(fg_bgr: np.ndarray, fg_a: np.ndarray, bg_bgr: np.ndarray, region_mask: np.ndarray) -> np.ndarray:
    """Match foreground mean/std in LAB to background patch (masked region)."""
    if region_mask.max() == 0 or fg_a.max() == 0:
        return fg_bgr
    fg_mask = (fg_a > 8).astype(np.uint8)
    if fg_mask.sum() < 50:
        return fg_bgr
    fg_lab = cv2.cvtColor(fg_bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    bg_lab = cv2.cvtColor(bg_bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    fg_sel = fg_mask > 0
    bg_sel = region_mask > 40
    if bg_sel.sum() < 100:
        return fg_bgr
    out = fg_lab.copy()
    for c in range(3):
        fs, bs = fg_lab[:, :, c][fg_sel], bg_lab[:, :, c][bg_sel]
        if fs.std() < 1e-3:
            continue
        out[:, :, c] = (out[:, :, c] - fs.mean()) * (bs.std() / max(fs.std(), 1e-3)) + bs.mean()
    out = np.clip(out, 0, 255).astype(np.uint8)
    return cv2.cvtColor(out, cv2.COLOR_LAB2BGR)


def _crop_cutout(product_rgba: Image.Image, placement_key: str) -> Image.Image:
    arr = np.array(product_rgba)
    a = arr[:, :, 3]
    ys, xs = np.where(a > 12)
    if len(ys) == 0:
        return product_rgba
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    crop = product_rgba.crop((x0, y0, x1 + 1, y1 + 1))
    if placement_key == "dress_worn":
        cw, ch = crop.size
        # Wedding cutouts: bride column, torso/skirt only (drop groom + bouquet).
        crop = crop.crop((int(cw * 0.52), int(ch * 0.06), int(cw * 0.96), int(ch * 0.42)))
        arr = np.array(crop)
        a = arr[:, :, 3]
        ys, xs = np.where(a > 12)
        if len(ys):
            y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
            crop = crop.crop((x0, y0, x1 + 1, y1 + 1))
    if placement_key == "watch_worn":
        arr = np.array(crop)
        a = arr[:, :, 3]
        n, labels, stats, _ = cv2.connectedComponentsWithStats((a > 12).astype(np.uint8), connectivity=8)
        if n > 1:
            best = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
            mask = labels == best
            ys, xs = np.where(mask)
            crop = crop.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
        cw, ch = crop.size
        crop = crop.crop((0, 0, int(cw * 0.92), int(ch * 0.88)))
    if placement_key in ("product_in_hand", "perfume_in_hand"):
        cw, ch = crop.size
        crop = crop.crop((int(cw * 0.48), 0, cw, ch))
        arr = np.array(crop)
        a = arr[:, :, 3]
        ys, xs = np.where(a > 12)
        if len(ys):
            y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
            crop = crop.crop((x0, y0, x1 + 1, y1 + 1))
    if placement_key == "shoe_worn":
        cw, ch = crop.size
        crop = crop.crop((int(cw * 0.02), int(ch * 0.05), int(cw * 0.98), int(ch * 0.92)))
    return crop


def _cover_regions(bg: np.ndarray, polygons: list[list[list[int]]]) -> np.ndarray:
    if not polygons:
        return bg
    mask = _poly_mask((bg.shape[1], bg.shape[0]), polygons)
    blurred = cv2.GaussianBlur(bg, (41, 41), 0)
    m = mask.astype(np.float32) / 255.0
    out = bg.copy()
    for c in range(3):
        out[:, :, c] = (blurred[:, :, c] * m + bg[:, :, c] * (1 - m)).astype(np.uint8)
    return out


def _quad_area(quad: list[list[int]]) -> float:
    pts = np.array(quad, dtype=np.float32)
    return float(cv2.contourArea(pts))


def _order_quad(pts: np.ndarray) -> np.ndarray:
    p = np.array(pts, dtype=np.float32)
    if p.shape != (4, 2):
        return p
    s = p.sum(axis=1)
    diff = np.diff(p, axis=1).ravel()
    tl = p[np.argmin(s)]
    br = p[np.argmax(s)]
    tr = p[np.argmin(diff)]
    bl = p[np.argmax(diff)]
    return np.array([tl, tr, br, bl], dtype=np.float32)


def _validate_shoe_quad(quad: list[list[int]], w: int, h: int) -> bool:
    area = _quad_area(quad)
    img_area = w * h
    if area < img_area * 0.004 or area > img_area * 0.12:
        return False
    xs = [p[0] for p in quad]
    ys = [p[1] for p in quad]
    bw, bh = max(xs) - min(xs), max(ys) - min(ys)
    if bw < 40 or bh < 25:
        return False
    if max(ys) < h * 0.45:
        return False
    if min(xs) < w * 0.02 and max(xs) < w * 0.35:
        return False
    return True


def _auto_shoe_quad(bg_bgr: np.ndarray) -> list[list[int]] | None:
    h, w = bg_bgr.shape[:2]
    y0, y1 = int(h * 0.55), int(h * 0.86)
    x0, x1 = int(w * 0.04), int(w * 0.42)
    roi = bg_bgr[y0:y1, x0:x1]
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(hsv, (0, 0, 150), (180, 90, 255))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not cnts:
        return None
    c = max(cnts, key=cv2.contourArea)
    if cv2.contourArea(c) < 2500:
        return None
    rect = cv2.minAreaRect(c)
    box = cv2.boxPoints(rect)
    box[:, 0] += x0
    box[:, 1] += y0
    quad = box.astype(int).tolist()
    return quad if _validate_shoe_quad(quad, w, h) else None


def _auto_watch_quad(bg_bgr: np.ndarray) -> list[list[int]] | None:
    h, w = bg_bgr.shape[:2]
    roi = bg_bgr[int(h * 0.15) : int(h * 0.75), int(w * 0.2) : int(w * 0.85)]
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 40, 120)
    edges = cv2.dilate(edges, np.ones((3, 3), np.uint8), 1)
    cnts, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not cnts:
        return None
    c = max(cnts, key=cv2.contourArea)
    x, y, bw, bh = cv2.boundingRect(c)
    if bw * bh < 400 or bw * bh > 80000:
        return None
    ox, oy = int(w * 0.2), int(h * 0.15)
    pad = 6
    quad = [
        [x + ox - pad, y + oy - pad],
        [x + ox + bw + pad, y + oy - pad],
        [x + ox + bw + pad, y + oy + bh + pad],
        [x + ox - pad, y + oy + bh + pad],
    ]
    return quad


def warp_wear(
    background: Image.Image,
    product_rgba: Image.Image,
    stock_id: str,
    placement_key: str,
) -> Image.Image:
    cfg = PLACEMENTS[stock_id][placement_key]
    ref = PLACEMENTS[stock_id].get("size")
    if ref and background.size != tuple(ref):
        background = background.resize(tuple(ref), Image.Resampling.LANCZOS)
    w, h = background.size
    bg = _pil_to_bgra(background)
    prod = _pil_to_bgra(_crop_cutout(product_rgba, placement_key))

    ph, pw = prod.shape[:2]
    src = np.float32([[0, 0], [pw - 1, 0], [pw - 1, ph - 1], [0, ph - 1]])
    dst_pts = list(cfg["dst_quad"])
    allow_auto = cfg.get("allow_auto_quad", False)
    if allow_auto and placement_key == "shoe_worn":
        auto = _auto_shoe_quad(bg[:, :, :3])
        if auto:
            dst_pts = auto
    elif allow_auto and placement_key == "watch_worn":
        auto = _auto_watch_quad(bg[:, :, :3])
        if auto:
            dst_pts = auto
    dst = _order_quad(np.float32(dst_pts))

    quad_int = np.round(dst).astype(int).tolist()
    cover_polys = list(cfg.get("cover_polygons", []))
    if not cover_polys and placement_key in ("shoe_worn", "watch_worn"):
        cover_polys = [quad_int]
    bg[:, :, :3] = _cover_regions(bg[:, :, :3], cover_polys)
    region_mask = _poly_mask((w, h), [quad_int])
    prod_rgb = _shift_color(prod, cfg.get("color_temp_shift", [1, 1, 1]))
    prod_rgb[:, :, :3] = _match_lab_region(prod_rgb[:, :, :3], prod_rgb[:, :, 3], bg[:, :, :3], region_mask)

    m = cv2.getPerspectiveTransform(src, dst)
    warped = cv2.warpPerspective(
        prod_rgb,
        m,
        (w, h),
        flags=cv2.INTER_LANCZOS4,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0, 0, 0, 0),
    )

    # Clip halo outside destination quad (reduces floating strap artifacts).
    clip_mask = _poly_mask((w, h), [quad_int])
    warped[:, :, 3] = np.minimum(warped[:, :, 3], clip_mask)

    alpha = warped[:, :, 3].astype(np.float32) / 255.0
    bg_rgb = bg[:, :, :3].astype(np.float32)
    warped_rgb = warped[:, :, :3].astype(np.float32)
    comp = (warped_rgb * alpha[..., None] + bg_rgb * (1 - alpha[..., None])).astype(np.uint8)

    # Contact shadow (under warped alpha)
    sh = cv2.GaussianBlur((warped[:, :, 3] * 0.55).astype(np.uint8), (25, 25), 0)
    shadow_rgb = comp.astype(np.float32)
    for c in range(3):
        shadow_rgb[:, :, c] = np.clip(shadow_rgb[:, :, c] - sh.astype(np.float32) * 0.35, 0, 255)
    comp = shadow_rgb.astype(np.uint8)

    comp_bgra = cv2.cvtColor(comp, cv2.COLOR_BGR2BGRA)

    occ = _poly_mask((w, h), cfg.get("occlusion_polygons", []))
    if occ.max() > 0:
        occ_f = occ.astype(np.float32) / 255.0
        for c in range(3):
            comp_bgra[:, :, c] = (
                bg[:, :, c].astype(np.float32) * occ_f + comp_bgra[:, :, c].astype(np.float32) * (1 - occ_f)
            ).astype(np.uint8)

    return _bgra_to_pil(comp_bgra).convert("RGB")
