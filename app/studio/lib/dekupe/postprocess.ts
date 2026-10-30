/**
 * Cutout post-process: hole-fill, matting-lite, guarded hybrid, green-spill suppress.
 * Ported from research/provider-test/scripts/run_benchmark.py recommendations.
 */

export type MaskStats = { area: number; mean: number };

export function extractAlphaMask(
  imageData: ImageData,
): { mask: Float32Array; stats: MaskStats } {
  const { data, width, height } = imageData;
  const mask = new Float32Array(width * height);
  let area = 0;
  let sum = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const a = data[i + 3]! / 255;
    mask[p] = a;
    sum += a;
    if (a > 0.5) area += 1;
  }
  return {
    mask,
    stats: { area, mean: sum / Math.max(1, width * height) },
  };
}

export function applyMaskToRgb(
  rgb: ImageData,
  mask: Float32Array,
): ImageData {
  const out = new ImageData(rgb.width, rgb.height);
  const src = rgb.data;
  const dst = out.data;
  for (let i = 0, p = 0; i < src.length; i += 4, p++) {
    dst[i] = src[i]!;
    dst[i + 1] = src[i + 1]!;
    dst[i + 2] = src[i + 2]!;
    dst[i + 3] = Math.round(Math.min(1, Math.max(0, mask[p]!)) * 255);
  }
  return out;
}

/**
 * Fill only small enclosed background holes inside the FG — do NOT close lace /
 * tulle / fur mesh (those are intentional alpha gaps). Previous close+open
 * filled mesh holes and destroyed hard SKUs.
 */
export function morphHoleFill(
  mask: Float32Array,
  width: number,
  height: number,
  radius = 1,
  maxHolePx = 64,
): Float32Array {
  const bin = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++) {
    bin[i] = mask[i]! > 0.5 ? 1 : 0;
  }
  // Flood-fill background from borders → remaining 0s inside FG are holes
  const visited = new Uint8Array(width * height);
  const qx = new Int32Array(width * height);
  const qy = new Int32Array(width * height);
  let qh = 0;
  let qt = 0;
  const push = (x: number, y: number) => {
    const i = y * width + x;
    if (visited[i] || bin[i]) return;
    visited[i] = 1;
    qx[qt] = x;
    qy[qt] = y;
    qt++;
  };
  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }
  while (qh < qt) {
    const x = qx[qh]!;
    const y = qy[qh]!;
    qh++;
    if (x > 0) push(x - 1, y);
    if (x + 1 < width) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y + 1 < height) push(x, y + 1);
  }

  // Label enclosed hole components; fill only tiny ones
  const outBin = new Uint8Array(bin);
  const seen = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (bin[i] || visited[i] || seen[i]) continue;
      // BFS component
      const cells: number[] = [];
      let h = 0;
      qx[0] = x;
      qy[0] = y;
      seen[i] = 1;
      let t = 1;
      while (h < t) {
        const cx = qx[h]!;
        const cy = qy[h]!;
        h++;
        const ci = cy * width + cx;
        cells.push(ci);
        const nbs: [number, number][] = [
          [cx - 1, cy],
          [cx + 1, cy],
          [cx, cy - 1],
          [cx, cy + 1],
        ];
        for (const [nx, ny] of nbs) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const ni = ny * width + nx;
          if (seen[ni] || bin[ni] || visited[ni]) continue;
          seen[ni] = 1;
          qx[t] = nx;
          qy[t] = ny;
          t++;
        }
      }
      if (cells.length > 0 && cells.length <= maxHolePx) {
        for (const ci of cells) outBin[ci] = 1;
      }
    }
  }

  const softSrc = new Uint8Array(width * height);
  for (let i = 0; i < softSrc.length; i++) softSrc[i] = outBin[i]! ? 255 : 0;
  // light edge soften only (radius 1), preserve lace mesh
  const soft = dilate(erode(softSrc, width, height, radius), width, height, radius);
  const blurred = boxBlur(soft, width, height, 1);
  const out = new Float32Array(width * height);
  for (let i = 0; i < out.length; i++) {
    // Prefer original alpha in uncertain fringe; filled holes → 1
    const filled = outBin[i]! && !bin[i]!;
    out[i] = filled ? Math.max(mask[i]!, blurred[i]! / 255) : mask[i]!;
  }
  return out;
}

/** Boost edge contrast for white-on-white SKUs (sneaker / ceramic). */
export function boostLowContrastEdges(
  rgb: ImageData,
  mask: Float32Array,
): Float32Array {
  const { data, width, height } = rgb;
  const out = mask.slice();
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p = y * width + x;
      const m = mask[p]!;
      if (m < 0.05 || m > 0.95) continue;
      const i = p * 4;
      const lum =
        0.2126 * data[i]! + 0.7152 * data[i + 1]! + 0.0722 * data[i + 2]!;
      // neighborhood mean luminance
      let sum = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const j = ((y + dy) * width + (x + dx)) * 4;
          sum +=
            0.2126 * data[j]! + 0.7152 * data[j + 1]! + 0.0722 * data[j + 2]!;
          n++;
        }
      }
      const mean = sum / n;
      const contrast = Math.abs(lum - mean);
      if (contrast < 8 && lum > 200) {
        // near-white fringe → pull toward FG if local FG dominates
        out[p] = Math.min(1, m + 0.12);
      } else if (contrast < 8 && lum > 180 && m < 0.55) {
        out[p] = Math.max(0, m - 0.08);
      }
    }
  }
  return out;
}

/**
 * Guarded hybrid: only blend ISNet when its FG area is within ~90–110% of BiRefNet.
 * Otherwise hybrid over-cuts lace / white sneakers (see research report).
 */
export function guardedHybrid(
  biref: Float32Array,
  isnet: Float32Array,
  birefArea: number,
  isnetArea: number,
): { mask: Float32Array; usedHybrid: boolean } {
  if (birefArea <= 0) {
    return { mask: biref.slice(), usedHybrid: false };
  }
  const ratio = isnetArea / birefArea;
  if (ratio < 0.9 || ratio > 1.1) {
    return { mask: biref.slice(), usedHybrid: false };
  }
  const out = new Float32Array(biref.length);
  for (let i = 0; i < out.length; i++) {
    const a = biref[i]!;
    const b = isnet[i]!;
    out[i] = Math.min(1, Math.max(0, Math.max(a, b) * 0.85 + Math.min(a, b) * 0.15));
  }
  return { mask: out, usedHybrid: true };
}

/** Edge-band matting-lite (uncertain alpha soften). */
export function refineAlphaEdges(
  mask: Float32Array,
  width: number,
  height: number,
): Float32Array {
  const soft = boxBlurFloat(mask, width, height, 1);
  const out = new Float32Array(mask.length);
  for (let i = 0; i < mask.length; i++) {
    const m = mask[i]!;
    if (m > 0.05 && m < 0.95) {
      out[i] = soft[i]! * 0.7 + m * 0.3;
    } else {
      out[i] = m;
    }
  }
  return boxBlurFloat(out, width, height, 1);
}

/**
 * Suppress green spill on semi-transparent fringe (hair/fur/lace on chroma).
 */
export function suppressGreenSpill(
  rgba: ImageData,
  fringeLow = 0.08,
  fringeHigh = 0.92,
): ImageData {
  const { data, width, height } = rgba;
  const out = new ImageData(width, height);
  out.data.set(data);
  const d = out.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3]! / 255;
    if (a <= fringeLow || a >= fringeHigh) continue;
    const r = d[i]!;
    const g = d[i + 1]!;
    const b = d[i + 2]!;
    if (g > r + 12 && g > b + 12) {
      const corr = Math.min(g, Math.round((r + b) / 2 + (g - (r + b) / 2) * 0.25));
      d[i + 1] = corr;
    }
  }
  return out;
}

function dilate(
  src: Uint8Array,
  w: number,
  h: number,
  r: number,
): Uint8Array {
  const out = new Uint8Array(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let max = 0;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          max = Math.max(max, src[yy * w + xx]!);
        }
      }
      out[y * w + x] = max;
    }
  }
  return out;
}

function erode(
  src: Uint8Array,
  w: number,
  h: number,
  r: number,
): Uint8Array {
  const out = new Uint8Array(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let min = 255;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) {
            min = 0;
            continue;
          }
          min = Math.min(min, src[yy * w + xx]!);
        }
      }
      out[y * w + x] = min;
    }
  }
  return out;
}

function boxBlur(
  src: Uint8Array,
  w: number,
  h: number,
  r: number,
): Uint8Array {
  const tmp = new Float32Array(src.length);
  const out = new Uint8Array(src.length);
  const f = new Float32Array(src.length);
  for (let i = 0; i < src.length; i++) f[i] = src[i]!;
  // horizontal
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let n = 0;
      for (let dx = -r; dx <= r; dx++) {
        const xx = x + dx;
        if (xx < 0 || xx >= w) continue;
        sum += f[y * w + xx]!;
        n++;
      }
      tmp[y * w + x] = sum / n;
    }
  }
  // vertical
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let n = 0;
      for (let dy = -r; dy <= r; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        sum += tmp[yy * w + x]!;
        n++;
      }
      out[y * w + x] = Math.round(sum / n);
    }
  }
  return out;
}

function boxBlurFloat(
  src: Float32Array,
  w: number,
  h: number,
  r: number,
): Float32Array {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let n = 0;
      for (let dx = -r; dx <= r; dx++) {
        const xx = x + dx;
        if (xx < 0 || xx >= w) continue;
        sum += src[y * w + xx]!;
        n++;
      }
      tmp[y * w + x] = sum / n;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let n = 0;
      for (let dy = -r; dy <= r; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        sum += tmp[yy * w + x]!;
        n++;
      }
      out[y * w + x] = sum / n;
    }
  }
  return out;
}

export async function imageDataFromUrl(url: string): Promise<ImageData> {
  const img = await loadHtmlImage(url);
  const c = document.createElement("canvas");
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, c.width, c.height);
}

export function imageDataToDataUrl(imageData: ImageData): string {
  const c = document.createElement("canvas");
  c.width = imageData.width;
  c.height = imageData.height;
  c.getContext("2d")!.putImageData(imageData, 0, 0);
  return c.toDataURL("image/png");
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Görsel okunamadı"));
    img.crossOrigin = "anonymous";
    img.src = src;
  });
}

/**
 * Keep the main subject: label 8-connected components of mask>thr and drop
 * components smaller than `minFrac` of the largest one (stray blobs, props
 * detached from the product). Soft alpha inside kept components is preserved.
 */
export function keepMainComponents(
  mask: Float32Array,
  w: number,
  h: number,
  minFrac = 0.08,
  thr = 0.35,
): Float32Array {
  const labels = new Int32Array(w * h).fill(-1);
  const areas: number[] = [];
  const stack = new Int32Array(w * h);
  for (let start = 0; start < w * h; start++) {
    if (labels[start] !== -1 || mask[start]! <= thr) continue;
    const id = areas.length;
    let area = 0;
    let sp = 0;
    stack[sp++] = start;
    labels[start] = id;
    while (sp > 0) {
      const p = stack[--sp]!;
      area++;
      const x = p % w;
      const y = (p - x) / w;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= w || (dx === 0 && dy === 0)) continue;
          const q = ny * w + nx;
          if (labels[q] === -1 && mask[q]! > thr) {
            labels[q] = id;
            stack[sp++] = q;
          }
        }
      }
    }
    areas.push(area);
  }
  if (areas.length <= 1) return mask;
  const maxA = Math.max(...areas);
  const keep = areas.map((a) => a >= maxA * minFrac);
  // soft pixels (<=thr) are kept only if adjacent to a kept component: dilate kept set by 2px
  const keptHard = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const l = labels[i]!;
    if (l >= 0 && keep[l]) keptHard[i] = 1;
  }
  const near = dilate(keptHard, w, h, 3);
  const out = new Float32Array(mask.length);
  for (let i = 0; i < out.length; i++) {
    const l = labels[i]!;
    if (l >= 0) out[i] = keep[l] ? mask[i]! : 0;
    else out[i] = near[i] ? mask[i]! : 0;
  }
  return out;
}
