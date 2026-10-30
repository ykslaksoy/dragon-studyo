/**
 * Magic-wand region grow (guided selection) on the source image.
 * Seeds from a click, grows over 4-neighbours whose colour stays close to the
 * seed AND close to the neighbour (edge stop). Returns a soft alpha mask at
 * source size (0..255), closed + feathered so edges are not jagged.
 */
export function wandMask(
  src: ImageData,
  seeds: { x: number; y: number }[],
  tolerance: number,
  bounds?: { x0: number; y0: number; x1: number; y1: number },
): Uint8ClampedArray {
  const { width: w, height: h, data } = src;
  const lab = new Float32Array(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    // cheap perceptual space: luma + two chroma axes
    lab[i * 3] = 0.299 * r + 0.587 * g + 0.114 * b;
    lab[i * 3 + 1] = (r - g) * 0.8;
    lab[i * 3 + 2] = ((r + g) / 2 - b) * 0.6;
  }
  const bx0 = bounds?.x0 ?? 0, by0 = bounds?.y0 ?? 0, bx1 = bounds?.x1 ?? w - 1, by1 = bounds?.y1 ?? h - 1;
  const sel = new Uint8Array(w * h);
  const dist = (a: number, b: number) => {
    const d0 = lab[a * 3] - lab[b * 3], d1 = lab[a * 3 + 1] - lab[b * 3 + 1], d2 = lab[a * 3 + 2] - lab[b * 3 + 2];
    return Math.sqrt(d0 * d0 * 1.6 + d1 * d1 + d2 * d2);
  };
  const stack: number[] = [];
  for (const s of seeds) {
    const sx = Math.round(s.x), sy = Math.round(s.y);
    if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
    const seed = sy * w + sx;
    // seed colour = 5x5 mean for stability
    const ref = [0, 0, 0];
    let n = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const x = sx + dx, y = sy + dy;
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const k = (y * w + x) * 3;
      ref[0] += lab[k]; ref[1] += lab[k + 1]; ref[2] += lab[k + 2]; n++;
    }
    ref[0] /= n; ref[1] /= n; ref[2] /= n;
    const dRef = (a: number) => {
      const d0 = lab[a * 3] - ref[0], d1 = lab[a * 3 + 1] - ref[1], d2 = lab[a * 3 + 2] - ref[2];
      return Math.sqrt(d0 * d0 * 1.6 + d1 * d1 + d2 * d2);
    };
    sel[seed] = 1;
    stack.push(seed);
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % w, y = (p - x) / w;
      const nb = [x > bx0 ? p - 1 : -1, x < bx1 ? p + 1 : -1, y > by0 ? p - w : -1, y < by1 ? p + w : -1];
      for (const q of nb) {
        if (q < 0 || sel[q]) continue;
        if (dRef(q) > tolerance || dist(p, q) > tolerance * 0.3) continue;
        sel[q] = 1;
        stack.push(q);
      }
    }
  }
  // close small holes (lace pattern): dilate r=2 then erode r=2
  const morph = (m: Uint8Array, r: number, dilate: boolean) => {
    const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let v = dilate ? 0 : 1;
        for (let k = -r; k <= r; k++) {
          const xx = Math.min(w - 1, Math.max(0, x + k));
          if (dilate ? m[y * w + xx] : !m[y * w + xx]) { v = dilate ? 1 : 0; break; }
        }
        tmp[y * w + x] = v;
      }
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let v = dilate ? 0 : 1;
      for (let k = -r; k <= r; k++) {
        const yy = Math.min(h - 1, Math.max(0, y + k));
        if (dilate ? tmp[yy * w + x] : !tmp[yy * w + x]) { v = dilate ? 1 : 0; break; }
      }
      out[y * w + x] = v;
    }
    return out;
  };
  const closed = morph(morph(sel, 3, true), 3, false);
  // feather: 3x3 box blur twice
  let a = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) a[i] = closed[i] * 255;
  for (let pass = 0; pass < 2; pass++) {
    const b = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        s += a[yy * w + xx]; n++;
      }
      b[y * w + x] = s / n;
    }
    a = b;
  }
  return Uint8ClampedArray.from(a);
}
