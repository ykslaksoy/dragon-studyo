/**
 * Keyless GEN fallback (no FAL_KEY): always composites the real product cutout
 * into a licensed stock scene so the product is guaranteed visible.
 * - lifestyle / UGC / stok hissi: product stands on the glossy studio floor of
 *   the fitness scene (contact shadow + floor reflection + depth-of-field bg).
 * - in-hand: product replaces the bottle held in the hand stock; the original
 *   bottle is inpainted out and the gripping fingers are re-drawn on top
 *   (feathered occlusion) so the product reads as held, not pasted.
 * Honest limit: not generative relighting; FAL_KEY enables photoreal frames.
 */

type Pt = [number, number];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Görsel yüklenemedi: ${src}`));
    img.src = src;
  });
}

function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** Crop cutout to its opaque bounding box. Throws if (nearly) empty. */
export function trimCutout(img: HTMLImageElement | HTMLCanvasElement): HTMLCanvasElement {
  const src = canvas(img.width, img.height);
  const sctx = src.getContext("2d")!;
  sctx.drawImage(img, 0, 0);
  const { data, width, height } = sctx.getImageData(0, 0, src.width, src.height);
  let x0 = width, y0 = height, x1 = -1, y1 = -1, n = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3]! > 24) {
        n++;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (n < 64 || x1 < x0) throw new Error("Cutout boş — ürün bulunamadı");
  const out = canvas(x1 - x0 + 1, y1 - y0 + 1);
  out.getContext("2d")!.drawImage(src, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

/** Mean RGB of opaque product pixels and of a scene region → mild colour match. */
function colorMatch(prod: HTMLCanvasElement, scene: HTMLCanvasElement, region: [number, number, number, number], strength = 0.35): HTMLCanvasElement {
  const pctx = prod.getContext("2d")!;
  const pd = pctx.getImageData(0, 0, prod.width, prod.height);
  const [rx, ry, rw, rh] = region;
  const sd = scene.getContext("2d")!.getImageData(rx, ry, rw, rh).data;
  let pr = 0, pg = 0, pb = 0, pn = 0, sr = 0, sg = 0, sb = 0;
  for (let i = 0; i < pd.data.length; i += 4) {
    if (pd.data[i + 3]! > 128) { pr += pd.data[i]!; pg += pd.data[i + 1]!; pb += pd.data[i + 2]!; pn++; }
  }
  for (let i = 0; i < sd.length; i += 4) { sr += sd[i]!; sg += sd[i + 1]!; sb += sd[i + 2]!; }
  const sn = sd.length / 4;
  if (!pn || !sn) return prod;
  // only transfer colour cast (chroma), keep product luminance
  const pl = (pr + pg + pb) / (3 * pn), sl = (sr + sg + sb) / (3 * sn);
  const k = [sr / sn / Math.max(sl, 1), sg / sn / Math.max(sl, 1), sb / sn / Math.max(sl, 1)];
  const kp = [pr / pn / Math.max(pl, 1), pg / pn / Math.max(pl, 1), pb / pn / Math.max(pl, 1)];
  const out = canvas(prod.width, prod.height);
  const od = new ImageData(prod.width, prod.height);
  for (let i = 0; i < pd.data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const f = 1 + strength * (k[c]! / Math.max(kp[c]!, 0.01) - 1);
      od.data[i + c] = Math.min(255, Math.max(0, Math.round(pd.data[i + c]! * Math.min(1.25, Math.max(0.8, f)))));
    }
    od.data[i + 3] = pd.data[i + 3]!;
  }
  out.getContext("2d")!.putImageData(od, 0, 0);
  return out;
}

/** Silhouette of product (alpha only) tinted black, for shadows. */
function silhouette(prod: HTMLCanvasElement, rgba = "rgba(0,0,0,1)"): HTMLCanvasElement {
  const c = canvas(prod.width, prod.height);
  const ctx = c.getContext("2d")!;
  ctx.drawImage(prod, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = rgba;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

function polyPath(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

/** Count product pixels in the final frame region → guarantee visibility. */
function assertVisible(prod: HTMLCanvasElement, drawnW: number, drawnH: number, frameW: number, frameH: number) {
  const cover = (drawnW * drawnH) / (frameW * frameH);
  if (!(cover > 0.02) || prod.width < 4 || prod.height < 4) {
    throw new Error("Ürün karede görünür değil");
  }
}

function label(ctx: CanvasRenderingContext2D, w: number, text: string) {
  ctx.fillStyle = "rgba(20,20,24,0.78)";
  ctx.fillRect(0, 0, w, 30);
  ctx.fillStyle = "#dcffc8";
  ctx.font = "600 11px system-ui,sans-serif";
  ctx.fillText(text, 12, 19);
}

/** Lifestyle / UGC: product on the glossy floor of the fitness scene. */
export async function renderLifestyleScene(
  cutoutSrc: string,
  out = { w: 720, h: 720 },
  stockUrl = "/mannequin/fitness_worn_gear.jpg",
): Promise<string> {
  const [stock, cut] = await Promise.all([loadImage(stockUrl), loadImage(cutoutSrc)]);
  // square crop of the right 2/3 (woman + window + floor)
  const S = Math.min(stock.width, stock.height);
  const sx = stock.width - S;
  const W = out.w, H = out.h;
  const c = canvas(W, H);
  const ctx = c.getContext("2d")!;
  // depth of field: blurred background
  ctx.filter = "blur(3px) brightness(0.96)";
  ctx.drawImage(stock, sx, 0, S, S, -8, -8, W + 16, H + 16);
  ctx.filter = "none";
  // floor line in crop space (~0.565 of stock height → floor surface)
  const floorY = H * 0.93;
  let prod = hardenAlpha(trimCutout(cut));
  prod = colorMatch(prod, c, [0, Math.round(H * 0.25), W, Math.round(H * 0.5)], 0.3);
  const maxH = H * 0.5, maxW = W * 0.46;
  const s = Math.min(maxH / prod.height, maxW / prod.width);
  const pw = prod.width * s, ph = prod.height * s;
  const px = W * 0.74 - pw / 2;
  const py = floorY - ph;
  assertVisible(prod, pw, ph, W, H);

  // floor reflection (glossy wood)
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.translate(px, floorY);
  ctx.scale(1, -1);
  ctx.drawImage(prod, 0, -ph * 0.02, pw, ph);
  ctx.restore();
  // contact shadow
  const sh = silhouette(prod, "rgba(0,0,0,1)");
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.filter = "blur(10px)";
  ctx.drawImage(sh, px + pw * 0.06, floorY - ph * 0.06, pw * 0.92, ph * 0.1);
  ctx.globalAlpha = 0.6;
  ctx.filter = "blur(3px)";
  ctx.drawImage(sh, px + pw * 0.05, floorY - 6, pw * 0.9, 9);
  ctx.restore();

  ctx.drawImage(prod, px, py, pw, ph);
  label(ctx, W, "Lifestyle — gerçek ürün kompoziti (FAL_KEY ile foto-gerçekçi)");
  return c.toDataURL("image/jpeg", 0.9);
}

/** Glass/clear products: BiRefNet leaves a soft semi-opaque box — keep only
 *  the confident core, then feather 1px. */
function hardenAlpha(c: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = c.getContext("2d")!;
  const d = ctx.getImageData(0, 0, c.width, c.height);
  for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i]! > 185 ? 255 : 0;
  ctx.putImageData(d, 0, 0);
  const o = canvas(c.width, c.height);
  const oc = o.getContext("2d")!;
  oc.filter = "blur(0.8px)";
  oc.drawImage(c, 0, 0);
  return o;
}

/** In-hand: product replaces the bottle held in the hand stock. */
export async function renderInHandScene(
  cutoutSrc: string,
  out = { w: 720, h: 720 },
  stockUrl = "/mannequin/hand_beauty.jpg",
  caption = "Elde — gerçek el fotoğrafı + ürün kompoziti (stok: Unsplash)",
): Promise<string> {
  const [stock, cut] = await Promise.all([loadImage(stockUrl), loadImage(cutoutSrc)]);
  const RW = 1400, RH = 933; // reference coords
  const base = canvas(RW, RH);
  const b = base.getContext("2d")!;
  b.drawImage(stock, 0, 0, RW, RH);
  const original = canvas(RW, RH);
  original.getContext("2d")!.drawImage(base, 0, 0);

  // 1) inpaint original bottle + drip with blurred dark backdrop
  const bottle: Pt[] = [[690, 345], [770, 270], [945, 225], [985, 300], [975, 420], [820, 430], [740, 470], [720, 520], [700, 470]];
  const bg = canvas(RW, RH);
  const bgc = bg.getContext("2d")!;
  bgc.filter = "blur(40px)";
  // sample backdrop from left dark area, shifted into place
  bgc.drawImage(base, 200, 60, 600, 420, 520, 120, 600, 420);
  // feathered patch (a hard clip left a visible dark quad)
  const pm = canvas(RW, RH);
  const pmc = pm.getContext("2d")!;
  pmc.filter = "blur(14px)";
  pmc.fillStyle = "#000";
  polyPath(pmc, bottle);
  pmc.fill();
  pmc.filter = "none";
  pmc.globalCompositeOperation = "source-in";
  pmc.drawImage(bg, 0, 0);
  b.drawImage(pm, 0, 0);
  b.drawImage(pm, 0, 0);

  // 2) product, rotated to the grip axis, right end under the fingers
  let prod = hardenAlpha(trimCutout(cut));
  prod = colorMatch(prod, original, [900, 250, 300, 300], 0.25);
  // stock bottle axis: base (945,260) → cap (710,395) ≈ 150°; an upright
  // product's cap points to −90°, so rotate by −120° to match the grip pose
  const angle = (-120 * Math.PI) / 180;
  const portrait = false;
  const s = 340 / Math.max(prod.width, prod.height);
  const pw = prod.width * s, ph = prod.height * s;
  const cx = 862, cy = 318; // bottle centre in the stock grip
  // contact/ambient shadow on fingers
  const sh = silhouette(prod);
  b.save();
  b.translate(cx + 10, cy + 18);
  b.rotate(portrait ? angle + Math.PI / 2 : angle);
  b.globalAlpha = 0.16;
  b.filter = "blur(10px)";
  b.drawImage(sh, -pw / 2, -ph / 2, pw, ph);
  b.restore();
  b.save();
  b.translate(cx, cy);
  b.rotate(portrait ? angle + Math.PI / 2 : angle);
  // grade on the product only (source-atop on the opaque base painted a dark quad)
  {
    const g = canvas(prod.width, prod.height);
    const gc = g.getContext("2d")!;
    gc.drawImage(prod, 0, 0);
    gc.globalCompositeOperation = "source-atop";
    const gr = gc.createLinearGradient(0, 0, prod.width, 0);
    gr.addColorStop(0, "rgba(255,190,120,0.10)");
    gr.addColorStop(1, "rgba(0,0,0,0.28)");
    gc.fillStyle = gr;
    gc.fillRect(0, 0, prod.width, prod.height);
    b.drawImage(g, -pw / 2, -ph / 2, pw, ph);
  }
  b.restore();

  // 3) re-draw gripping hand (thumb + index/middle) on top, feathered
  const hand: Pt[] = [[925, 150], [990, 160], [1060, 250], [1240, 360], [1270, 933], [890, 933], [880, 640], [845, 545], [860, 430], [868, 372], [905, 330], [925, 260]];
  const mask = canvas(RW, RH);
  const m = mask.getContext("2d")!;
  m.filter = "blur(7px)";
  m.fillStyle = "#000";
  polyPath(m, hand);
  m.fill();
  m.filter = "none";
  // the stock bottle's own label peeks out between thumb and fingers → cut it out
  m.globalCompositeOperation = "destination-out";
  m.filter = "blur(4px)";
  polyPath(m, [[900, 285], [962, 262], [972, 352], [912, 372]]);
  m.fill();
  m.filter = "none";
  m.globalCompositeOperation = "source-in";
  m.drawImage(original, 0, 0);
  b.drawImage(mask, 0, 0);

  // 4) crop square around grip and scale to output
  const S = RH;
  const sx = 380;
  const c = canvas(out.w, out.h);
  const ctx = c.getContext("2d")!;
  ctx.drawImage(base, sx, 0, S, S, 0, 0, out.w, out.h);
  assertVisible(prod, pw * (out.w / S), ph * (out.h / S), out.w, out.h);
  label(ctx, out.w, caption);
  return c.toDataURL("image/jpeg", 0.9);
}
