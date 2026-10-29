/**
 * Occlusion-warp wear compositing v3 — TypeScript port of
 * research/provider-test/scripts/wear_engine.py (PR #10).
 * Perspective warp + LAB-ish color match + foreground occlusion polygons.
 * Honest limit: not photoreal VTON; free commercial-safe path without GPU API.
 */

import {
  WEAR_PLACEMENTS,
  type PlacementCfg,
  type Point,
  type WearJob,
} from "./placements";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Stok yüklenemedi: ${src}`));
    img.src = src;
  });
}

function imageToCanvas(img: HTMLImageElement | HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  c.getContext("2d")!.drawImage(img, 0, 0);
  return c;
}

function getImageData(src: HTMLCanvasElement): ImageData {
  return src.getContext("2d")!.getImageData(0, 0, src.width, src.height);
}

function cropOpaque(rgba: ImageData): {
  canvas: HTMLCanvasElement;
  x0: number;
  y0: number;
} {
  const { data, width, height } = rgba;
  let x0 = width;
  let y0 = height;
  let x1 = 0;
  let y1 = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3]! > 12) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < x0 || y1 < y0) {
    const empty = document.createElement("canvas");
    empty.width = 1;
    empty.height = 1;
    return { canvas: empty, x0: 0, y0: 0 };
  }
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  const c = document.createElement("canvas");
  c.width = cw;
  c.height = ch;
  const tmp = document.createElement("canvas");
  tmp.width = width;
  tmp.height = height;
  tmp.getContext("2d")!.putImageData(rgba, 0, 0);
  c.getContext("2d")!.drawImage(tmp, x0, y0, cw, ch, 0, 0, cw, ch);
  return { canvas: c, x0, y0 };
}

function cropForPlacement(
  cutout: HTMLCanvasElement,
  placementKey: string,
): HTMLCanvasElement {
  const rgba = getImageData(cutout);
  let { canvas } = cropOpaque(rgba);
  const cw = canvas.width;
  const ch = canvas.height;
  const out = document.createElement("canvas");
  const ctx = out.getContext("2d")!;

  if (placementKey === "dress_worn") {
    out.width = Math.max(1, Math.floor(cw * 0.44));
    out.height = Math.max(1, Math.floor(ch * 0.36));
    ctx.drawImage(
      canvas,
      Math.floor(cw * 0.52),
      Math.floor(ch * 0.06),
      out.width,
      out.height,
      0,
      0,
      out.width,
      out.height,
    );
    return cropOpaque(getImageData(out)).canvas;
  }
  if (placementKey === "watch_worn") {
    out.width = Math.max(1, Math.floor(cw * 0.92));
    out.height = Math.max(1, Math.floor(ch * 0.88));
    ctx.drawImage(canvas, 0, 0, out.width, out.height, 0, 0, out.width, out.height);
    return out;
  }
  if (
    placementKey === "product_in_hand" ||
    placementKey === "perfume_in_hand"
  ) {
    const left = Math.floor(cw * 0.48);
    out.width = Math.max(1, cw - left);
    out.height = ch;
    ctx.drawImage(canvas, left, 0, out.width, out.height, 0, 0, out.width, out.height);
    return cropOpaque(getImageData(out)).canvas;
  }
  if (placementKey === "shoe_worn") {
    const x = Math.floor(cw * 0.02);
    const y = Math.floor(ch * 0.05);
    out.width = Math.max(1, Math.floor(cw * 0.96));
    out.height = Math.max(1, Math.floor(ch * 0.87));
    ctx.drawImage(canvas, x, y, out.width, out.height, 0, 0, out.width, out.height);
    return out;
  }
  return canvas;
}

function orderQuad(pts: Point[]): Point[] {
  const p = pts.map((q) => [...q] as Point);
  if (p.length !== 4) return p;
  const sum = p.map(([x, y]) => x + y);
  const diff = p.map(([x, y]) => y - x);
  const tl = p[sum.indexOf(Math.min(...sum))]!;
  const br = p[sum.indexOf(Math.max(...sum))]!;
  const tr = p[diff.indexOf(Math.min(...diff))]!;
  const bl = p[diff.indexOf(Math.max(...diff))]!;
  return [tl, tr, br, bl];
}

/** Solve 3x3 linear system (Cramer's / Gaussian) for perspective matrix. */
function solvePerspective(src: Point[], dst: Point[]): Float64Array {
  // Map unit square corners → dst via homography from src→dst
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i]!;
    const [u, v] = dst[i]!;
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  // Gaussian elimination 8x8
  const n = 8;
  const M = A.map((row, i) => [...row, b[i]!]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r]![col]!) > Math.abs(M[pivot]![col]!)) pivot = r;
    }
    [M[col], M[pivot]] = [M[pivot]!, M[col]!];
    const div = M[col]![col]!;
    if (Math.abs(div) < 1e-12) continue;
    for (let c = col; c <= n; c++) M[col]![c]! /= div;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r]![col]!;
      for (let c = col; c <= n; c++) M[r]![c]! -= f * M[col]![c]!;
    }
  }
  const h = new Float64Array(9);
  for (let i = 0; i < 8; i++) h[i] = M[i]![n]!;
  h[8] = 1;
  return h;
}

function applyH(h: Float64Array, x: number, y: number): [number, number] {
  const w = h[6]! * x + h[7]! * y + h[8]!;
  const u = (h[0]! * x + h[1]! * y + h[2]!) / w;
  const v = (h[3]! * x + h[4]! * y + h[5]!) / w;
  return [u, v];
}

function invertH(h: Float64Array): Float64Array | null {
  const m = [
    [h[0]!, h[1]!, h[2]!],
    [h[3]!, h[4]!, h[5]!],
    [h[6]!, h[7]!, h[8]!],
  ];
  const det =
    m[0]![0]! * (m[1]![1]! * m[2]![2]! - m[1]![2]! * m[2]![1]!) -
    m[0]![1]! * (m[1]![0]! * m[2]![2]! - m[1]![2]! * m[2]![0]!) +
    m[0]![2]! * (m[1]![0]! * m[2]![1]! - m[1]![1]! * m[2]![0]!);
  if (Math.abs(det) < 1e-12) return null;
  const inv = new Float64Array(9);
  inv[0] = (m[1]![1]! * m[2]![2]! - m[1]![2]! * m[2]![1]!) / det;
  inv[1] = (m[0]![2]! * m[2]![1]! - m[0]![1]! * m[2]![2]!) / det;
  inv[2] = (m[0]![1]! * m[1]![2]! - m[0]![2]! * m[1]![1]!) / det;
  inv[3] = (m[1]![2]! * m[2]![0]! - m[1]![0]! * m[2]![2]!) / det;
  inv[4] = (m[0]![0]! * m[2]![2]! - m[0]![2]! * m[2]![0]!) / det;
  inv[5] = (m[0]![2]! * m[1]![0]! - m[0]![0]! * m[1]![2]!) / det;
  inv[6] = (m[1]![0]! * m[2]![1]! - m[1]![1]! * m[2]![0]!) / det;
  inv[7] = (m[0]![1]! * m[2]![0]! - m[0]![0]! * m[2]![1]!) / det;
  inv[8] = (m[0]![0]! * m[1]![1]! - m[0]![1]! * m[1]![0]!) / det;
  return inv;
}

function warpPerspective(
  src: ImageData,
  dstW: number,
  dstH: number,
  dstQuad: Point[],
): ImageData {
  const sw = src.width;
  const sh = src.height;
  const srcPts: Point[] = [
    [0, 0],
    [sw - 1, 0],
    [sw - 1, sh - 1],
    [0, sh - 1],
  ];
  const ordered = orderQuad(dstQuad);
  const h = solvePerspective(srcPts, ordered);
  const hInv = invertH(h);
  const out = new ImageData(dstW, dstH);
  if (!hInv) return out;

  const xs = ordered.map((p) => p[0]);
  const ys = ordered.map((p) => p[1]);
  const minX = Math.max(0, Math.floor(Math.min(...xs) - 2));
  const maxX = Math.min(dstW - 1, Math.ceil(Math.max(...xs) + 2));
  const minY = Math.max(0, Math.floor(Math.min(...ys) - 2));
  const maxY = Math.min(dstH - 1, Math.ceil(Math.max(...ys) + 2));

  const s = src.data;
  const d = out.data;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const [u, v] = applyH(hInv, x, y);
      if (u < -1 || v < -1 || u > sw || v > sh) continue;
      const x0 = Math.floor(u);
      const y0 = Math.floor(v);
      const x1 = Math.min(sw - 1, x0 + 1);
      const y1 = Math.min(sh - 1, y0 + 1);
      if (x0 < 0 || y0 < 0 || x0 >= sw || y0 >= sh) continue;
      const fx = u - x0;
      const fy = v - y0;
      const i00 = (y0 * sw + x0) * 4;
      const i01 = (y0 * sw + x1) * 4;
      const i10 = (y1 * sw + x0) * 4;
      const i11 = (y1 * sw + x1) * 4;
      const di = (y * dstW + x) * 4;
      for (let c = 0; c < 4; c++) {
        const v00 = s[i00 + c]!;
        const v01 = s[i01 + c]!;
        const v10 = s[i10 + c]!;
        const v11 = s[i11 + c]!;
        d[di + c] = Math.round(
          v00 * (1 - fx) * (1 - fy) +
            v01 * fx * (1 - fy) +
            v10 * (1 - fx) * fy +
            v11 * fx * fy,
        );
      }
    }
  }
  return out;
}

function fillPolyMask(
  w: number,
  h: number,
  polygons: Point[][],
): Float32Array {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#fff";
  for (const poly of polygons) {
    if (poly.length < 3) continue;
    ctx.beginPath();
    ctx.moveTo(poly[0]![0], poly[0]![1]);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i]![0], poly[i]![1]);
    ctx.closePath();
    ctx.fill();
  }
  // soft blur via filter
  const soft = document.createElement("canvas");
  soft.width = w;
  soft.height = h;
  const sctx = soft.getContext("2d")!;
  sctx.filter = "blur(4px)";
  sctx.drawImage(c, 0, 0);
  const data = sctx.getImageData(0, 0, w, h).data;
  const mask = new Float32Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    mask[p] = data[i]! / 255;
  }
  return mask;
}

function coverRegions(
  bg: ImageData,
  polygons: Point[][],
): ImageData {
  if (!polygons.length) return bg;
  const { width: w, height: h, data } = bg;
  const mask = fillPolyMask(w, h, polygons);
  // box blur of bg for cover
  const blurC = document.createElement("canvas");
  blurC.width = w;
  blurC.height = h;
  const bctx = blurC.getContext("2d")!;
  const tmp = document.createElement("canvas");
  tmp.width = w;
  tmp.height = h;
  tmp.getContext("2d")!.putImageData(bg, 0, 0);
  bctx.filter = "blur(18px)";
  bctx.drawImage(tmp, 0, 0);
  const blurred = bctx.getImageData(0, 0, w, h).data;
  const out = new ImageData(w, h);
  const o = out.data;
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const m = mask[p]!;
    o[i] = Math.round(blurred[i]! * m + data[i]! * (1 - m));
    o[i + 1] = Math.round(blurred[i + 1]! * m + data[i + 1]! * (1 - m));
    o[i + 2] = Math.round(blurred[i + 2]! * m + data[i + 2]! * (1 - m));
    o[i + 3] = 255;
  }
  return out;
}

function colorTempShift(
  rgba: ImageData,
  shift: [number, number, number] = [1, 1, 1],
): ImageData {
  const out = new ImageData(rgba.width, rgba.height);
  const s = rgba.data;
  const d = out.data;
  for (let i = 0; i < s.length; i += 4) {
    d[i] = Math.min(255, Math.round(s[i]! * shift[0]));
    d[i + 1] = Math.min(255, Math.round(s[i + 1]! * shift[1]));
    d[i + 2] = Math.min(255, Math.round(s[i + 2]! * shift[2]));
    d[i + 3] = s[i + 3]!;
  }
  return out;
}

function matchMeanColor(
  fg: ImageData,
  bg: ImageData,
  regionMask: Float32Array,
): ImageData {
  const fd = fg.data;
  const bd = bg.data;
  let fr = 0;
  let fg_ = 0;
  let fb = 0;
  let fn = 0;
  let br = 0;
  let bg_ = 0;
  let bb = 0;
  let bn = 0;
  for (let i = 0, p = 0; i < fd.length; i += 4, p++) {
    if (fd[i + 3]! > 8) {
      fr += fd[i]!;
      fg_ += fd[i + 1]!;
      fb += fd[i + 2]!;
      fn++;
    }
    if (regionMask[p]! > 0.15) {
      br += bd[i]!;
      bg_ += bd[i + 1]!;
      bb += bd[i + 2]!;
      bn++;
    }
  }
  if (fn < 50 || bn < 100) return fg;
  fr /= fn;
  fg_ /= fn;
  fb /= fn;
  br /= bn;
  bg_ /= bn;
  bb /= bn;
  const sr = br / Math.max(fr, 1);
  const sg = bg_ / Math.max(fg_, 1);
  const sb = bb / Math.max(fb, 1);
  // mild match
  const out = new ImageData(fg.width, fg.height);
  const o = out.data;
  for (let i = 0; i < fd.length; i += 4) {
    o[i] = Math.min(255, Math.round(fd[i]! * (0.7 + 0.3 * sr)));
    o[i + 1] = Math.min(255, Math.round(fd[i + 1]! * (0.7 + 0.3 * sg)));
    o[i + 2] = Math.min(255, Math.round(fd[i + 2]! * (0.7 + 0.3 * sb)));
    o[i + 3] = fd[i + 3]!;
  }
  return out;
}

function clipAlphaToQuad(warped: ImageData, quad: Point[]): ImageData {
  const mask = fillPolyMask(warped.width, warped.height, [quad]);
  const out = new ImageData(warped.width, warped.height);
  out.data.set(warped.data);
  for (let i = 0, p = 0; i < out.data.length; i += 4, p++) {
    out.data[i + 3] = Math.round(out.data[i + 3]! * mask[p]!);
  }
  return out;
}

function compositeWear(
  bg: ImageData,
  warped: ImageData,
  occlusion: Point[][],
): ImageData {
  const { width: w, height: h } = bg;
  const out = new ImageData(w, h);
  const o = out.data;
  const b = bg.data;
  const f = warped.data;

  // soft contact shadow from warped alpha
  const shadowC = document.createElement("canvas");
  shadowC.width = w;
  shadowC.height = h;
  const sctx = shadowC.getContext("2d")!;
  const alphaOnly = new ImageData(w, h);
  for (let i = 0; i < f.length; i += 4) {
    const a = Math.round(f[i + 3]! * 0.55);
    alphaOnly.data[i] = 0;
    alphaOnly.data[i + 1] = 0;
    alphaOnly.data[i + 2] = 0;
    alphaOnly.data[i + 3] = a;
  }
  const tmp = document.createElement("canvas");
  tmp.width = w;
  tmp.height = h;
  tmp.getContext("2d")!.putImageData(alphaOnly, 0, 0);
  sctx.filter = "blur(12px)";
  sctx.drawImage(tmp, 4, 6);
  const sh = sctx.getImageData(0, 0, w, h).data;

  for (let i = 0; i < o.length; i += 4) {
    const a = f[i + 3]! / 255;
    const shadow = sh[i + 3]! / 255;
    const dim = 1 - shadow * 0.35;
    const br = b[i]! * dim;
    const bg_ = b[i + 1]! * dim;
    const bb = b[i + 2]! * dim;
    o[i] = Math.round(f[i]! * a + br * (1 - a));
    o[i + 1] = Math.round(f[i + 1]! * a + bg_ * (1 - a));
    o[i + 2] = Math.round(f[i + 2]! * a + bb * (1 - a));
    o[i + 3] = 255;
  }

  if (occlusion.length) {
    const occ = fillPolyMask(w, h, occlusion);
    for (let i = 0, p = 0; i < o.length; i += 4, p++) {
      const m = occ[p]!;
      if (m <= 0) continue;
      o[i] = Math.round(b[i]! * m + o[i]! * (1 - m));
      o[i + 1] = Math.round(b[i + 1]! * m + o[i + 1]! * (1 - m));
      o[i + 2] = Math.round(b[i + 2]! * m + o[i + 2]! * (1 - m));
    }
  }
  return out;
}

function asPlacement(cfg: PlacementCfg | [number, number] | undefined): PlacementCfg | null {
  if (!cfg || Array.isArray(cfg)) return null;
  return cfg;
}

/**
 * Render worn / in-use mannequin shot via occlusion warp v3.
 */
export async function renderWearFrame(
  cutoutSrc: string,
  job: WearJob,
  outSize = { w: 720, h: 720 },
): Promise<string> {
  const stockMeta = WEAR_PLACEMENTS[job.stockId];
  if (!stockMeta) throw new Error(`Bilinmeyen stok: ${job.stockId}`);
  const cfg = asPlacement(stockMeta[job.placementKey]);
  if (!cfg) throw new Error(`Bilinmeyen yerleştirme: ${job.placementKey}`);

  const [refW, refH] = stockMeta.size;
  const stockImg = await loadImage(job.stockUrl);
  const cutImg = await loadImage(cutoutSrc);

  const stockCanvas = document.createElement("canvas");
  stockCanvas.width = refW;
  stockCanvas.height = refH;
  stockCanvas.getContext("2d")!.drawImage(stockImg, 0, 0, refW, refH);

  let bg = getImageData(stockCanvas);
  const cutFull = imageToCanvas(cutImg);
  const cropped = cropForPlacement(cutFull, job.placementKey);
  let prod = getImageData(cropped);

  const dstQuad = orderQuad(cfg.dst_quad.map((p) => [...p] as Point));
  let cover = cfg.cover_polygons ?? [];
  if (!cover.length && (job.placementKey === "shoe_worn" || job.placementKey === "watch_worn")) {
    cover = [dstQuad];
  }
  bg = coverRegions(bg, cover);
  const regionMask = fillPolyMask(refW, refH, [dstQuad]);
  prod = colorTempShift(prod, cfg.color_temp_shift ?? [1, 1, 1]);
  prod = matchMeanColor(prod, bg, regionMask);

  let warped = warpPerspective(prod, refW, refH, dstQuad);
  warped = clipAlphaToQuad(warped, dstQuad);
  let composed = compositeWear(bg, warped, cfg.occlusion_polygons ?? []);

  // scale to output
  const full = document.createElement("canvas");
  full.width = refW;
  full.height = refH;
  full.getContext("2d")!.putImageData(composed, 0, 0);

  const out = document.createElement("canvas");
  out.width = outSize.w;
  out.height = outSize.h;
  const octx = out.getContext("2d")!;
  // cover fit
  const scale = Math.max(outSize.w / refW, outSize.h / refH);
  const dw = refW * scale;
  const dh = refH * scale;
  octx.drawImage(full, (outSize.w - dw) / 2, (outSize.h - dh) / 2, dw, dh);

  // honest label strip
  octx.fillStyle = "rgba(20,20,24,0.88)";
  octx.fillRect(0, 0, outSize.w, 36);
  octx.fillStyle = "#dcffc8";
  octx.font = "600 11px system-ui,sans-serif";
  octx.fillText("Manken — occlusion warp v3 (VTON API değil)", 12, 22);

  return out.toDataURL("image/jpeg", 0.9);
}
