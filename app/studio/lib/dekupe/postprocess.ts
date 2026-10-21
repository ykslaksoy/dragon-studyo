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

/** Morphological close + open approximation + blur (hole-fill). */
export function morphHoleFill(
  mask: Float32Array,
  width: number,
  height: number,
  radius = 2,
): Float32Array {
  const bin = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++) {
    bin[i] = mask[i]! > 0.5 ? 255 : 0;
  }
  const closed = dilate(erode(bin, width, height, radius), width, height, radius);
  const opened = erode(dilate(closed, width, height, radius), width, height, radius);
  const blurred = boxBlur(opened, width, height, 2);
  const out = new Float32Array(width * height);
  for (let i = 0; i < out.length; i++) {
    out[i] = blurred[i]! / 255;
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
