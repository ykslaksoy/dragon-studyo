/**
 * Worn / in-use frames on drawn mannequin forms (free path, no FAL_KEY).
 *
 * Because the mannequin form is drawn by us, occlusion is exact:
 * - shoe:  leg form is drawn first, the shoe over it (shoe hides the foot),
 *          then a sock rim + trouser hem are drawn over the shoe collar.
 *          Sole is levelled and a light perspective + contact shadow added.
 * - watch: strap axis is found (PCA) and turned across a forearm display form;
 *          strap parts outside the arm silhouette are hidden (wrap behind the
 *          wrist) and shaded towards the edges like a curved strap.
 * - dress: dress hangs from the shoulders of a dress form; the form's neck
 *          and stand are drawn so the garment sits on the form.
 * - other: product stands on a plinth (never floating).
 * Perfume / skincare use the photographic in-hand scene (fingers re-drawn).
 * Honest limit: a mannequin form, not a human model; photoreal people need FAL_KEY.
 */

import { renderInHandScene, trimCutout } from "../lifestyleFallback";

export type ProductKind = "shoe" | "watch" | "bottle" | "dress" | "other";

export const PRODUCT_KINDS: { id: ProductKind | "auto"; label: string }[] = [
  { id: "auto", label: "Otomatik" },
  { id: "shoe", label: "Ayakkabı" },
  { id: "watch", label: "Saat / bileklik" },
  { id: "bottle", label: "Parfüm / kozmetik" },
  { id: "dress", label: "Elbise / giyim" },
  { id: "other", label: "Diğer" },
];

/** Cheap guess from file name, then cutout shape. User can override. */
export function guessKind(fileName: string, aspect: number): ProductKind {
  const n = fileName.toLowerCase();
  if (/sneaker|shoe|ayakkab|boot|bot|terlik|sandal/.test(n)) return "shoe";
  if (/watch|saat|bileklik|bracelet/.test(n)) return "watch";
  if (/perfume|parf|skincare|krem|cream|serum|bottle|şişe|kozmetik/.test(n)) return "bottle";
  if (/dress|elbise|gömlek|shirt|ceket|jacket|etek|skirt|lace|dantel/.test(n)) return "dress";
  if (aspect > 1.35) return "shoe";
  return "other";
}

const S = 720;

function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Kesim yüklenemedi"));
    img.src = src;
  });
}

function rotate(src: HTMLCanvasElement, rad: number): HTMLCanvasElement {
  const c = Math.abs(Math.cos(rad)), s = Math.abs(Math.sin(rad));
  const out = canvas(src.width * c + src.height * s, src.width * s + src.height * c);
  const ctx = out.getContext("2d")!;
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate(rad);
  ctx.drawImage(src, -src.width / 2, -src.height / 2);
  return trimCutout(out);
}

function alphaOf(c: HTMLCanvasElement): Uint8ClampedArray {
  const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
  const a = new Uint8ClampedArray(c.width * c.height);
  for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3]!;
  return a;
}

function scaled(src: HTMLCanvasElement, w: number, h: number): HTMLCanvasElement {
  const out = canvas(w, h);
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, out.width, out.height);
  return out;
}

function studioBackground(ctx: CanvasRenderingContext2D, floorY: number) {
  const g = ctx.createLinearGradient(0, 0, 0, S);
  g.addColorStop(0, "#ece8e2");
  g.addColorStop(floorY / S, "#ddd7cf");
  g.addColorStop(1, "#cfc8bf");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const v = ctx.createRadialGradient(S / 2, S * 0.45, S * 0.2, S / 2, S * 0.5, S * 0.75);
  v.addColorStop(0, "rgba(255,255,255,0.25)");
  v.addColorStop(1, "rgba(0,0,0,0.12)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, S, S);
}

function softEllipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, alpha: number, blur: number) {
  ctx.save();
  ctx.filter = `blur(${blur}px)`;
  ctx.fillStyle = `rgba(20,16,12,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Horizontal cylinder shading for a vertical form between x0..x1. */
function cylinderFill(ctx: CanvasRenderingContext2D, x0: number, x1: number, base: [number, number, number]) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  const c = (k: number) => `rgb(${base.map((v) => Math.round(Math.min(255, v * k))).join(",")})`;
  g.addColorStop(0, c(0.72));
  g.addColorStop(0.3, c(1.04));
  g.addColorStop(0.55, c(1.0));
  g.addColorStop(1, c(0.7));
  return g;
}

// ---------------- shoe ----------------

function soleAngle(prod: HTMLCanvasElement): number {
  // tangent of the lower convex hull between heel zone and toe zone
  const a = alphaOf(prod);
  const w = prod.width, h = prod.height;
  const bot: [number, number][] = [];
  for (let x = 0; x < w; x += 2) {
    for (let y = h - 1; y >= 0; y--) if (a[y * w + x]! > 80) { bot.push([x, y]); break; }
  }
  if (bot.length < 10) return 0;
  const x0 = bot[0]![0], x1 = bot[bot.length - 1]![0], span = x1 - x0;
  let best = 0, bestScore = Infinity;
  for (let d = -50; d <= 50; d += 0.5) {
    const t = (d * Math.PI) / 180, c = Math.cos(t), sn = Math.sin(t);
    // rotated y of each bottom point; a level sole has both ends touching the max
    let maxL = -Infinity, maxR = -Infinity;
    for (const [x, y] of bot) {
      const ry = x * sn + y * c;
      if (x < x0 + span * 0.4) maxL = Math.max(maxL, ry);
      else if (x > x0 + span * 0.6) maxR = Math.max(maxR, ry);
    }
    const sc = Math.abs(maxL - maxR);
    if (sc < bestScore) { bestScore = sc; best = t; }
  }
  return best;
}

function levelShoe(prod: HTMLCanvasElement): HTMLCanvasElement {
  const t = soleAngle(prod);
  return Math.abs(t) > 0.02 ? rotate(prod, t) : prod;
}

async function renderShoe(cut: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  let shoe = levelShoe(cut);
  // toe should point left-ish? keep as photographed; ankle goes into collar
  const L = S * 0.62;
  shoe = scaled(shoe, L, (shoe.height * L) / shoe.width);
  const w = shoe.width, h = shoe.height;
  const a = alphaOf(shoe);
  const top: number[] = [];
  for (let x = 0; x < w; x++) {
    let t = h;
    for (let y = 0; y < h; y++) if (a[y * w + x]! > 80) { t = y; break; }
    top.push(t);
  }
  const minTop = Math.min(...top);
  // collar = highest part of the upper (heel counter / opening)
  let cx0 = w, cx1 = 0;
  top.forEach((t, x) => { if (t < minTop + h * 0.14) { cx0 = Math.min(cx0, x); cx1 = Math.max(cx1, x); } });
  const ankleW = Math.min(Math.max(cx1 - cx0, L * 0.2), L * 0.3);
  const collarX = (cx0 + cx1) / 2;

  const out = canvas(S, S);
  const ctx = out.getContext("2d")!;
  const floorY = S * 0.84;
  studioBackground(ctx, floorY);

  const ox = (S - w) / 2;
  const oy = floorY - h;
  const ax = ox + collarX;
  const collarY = oy + minTop;

  // contact + ambient shadow under sole
  softEllipse(ctx, S / 2, floorY + 2, w * 0.5, h * 0.06, 0.35, 10);
  softEllipse(ctx, S / 2, floorY, w * 0.42, h * 0.025, 0.55, 3);

  // leg form (mannequin) going down into the shoe
  const legTop = -10;
  const legBottom = collarY + h * 0.35;
  const calfW = ankleW * 1.45;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(ax - calfW / 2, legTop);
  ctx.bezierCurveTo(ax - calfW / 2, collarY - h * 0.9, ax - ankleW / 2, collarY - h * 0.5, ax - ankleW / 2, legBottom);
  ctx.lineTo(ax + ankleW / 2, legBottom);
  ctx.bezierCurveTo(ax + ankleW / 2, collarY - h * 0.5, ax + calfW / 2, collarY - h * 0.9, ax + calfW / 2, legTop);
  ctx.closePath();
  ctx.fillStyle = cylinderFill(ctx, ax - calfW / 2, ax + calfW / 2, [222, 214, 204]);
  ctx.fill();
  ctx.restore();

  // shadow cast by the leg into the collar
  softEllipse(ctx, ax, collarY + h * 0.05, ankleW * 0.55, h * 0.05, 0.4, 4);

  // shoe (hides the foot) with light perspective
  ctx.save();
  ctx.translate(ox, oy);
  ctx.transform(1, 0, -0.04, 1, h * 0.04, 0);
  ctx.drawImage(shoe, 0, 0);
  ctx.restore();

  // sock rim over the collar edge (foot sits inside the shoe)
  const rimY = collarY + h * 0.035;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(ax, rimY, ankleW * 0.52, h * 0.045, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = cylinderFill(ctx, ax - ankleW / 2, ax + ankleW / 2, [236, 233, 228]);
  ctx.fillRect(ax - ankleW, rimY - h * 0.08, ankleW * 2, h * 0.16);
  ctx.restore();
  ctx.fillStyle = cylinderFill(ctx, ax - ankleW / 2, ax + ankleW / 2, [236, 233, 228]);
  ctx.fillRect(ax - ankleW * 0.5, rimY - h * 0.22, ankleW, h * 0.22);

  // trouser hem (cropped, charcoal) above the ankle
  const hemY = collarY - h * 0.2;
  const hemW = calfW * 1.25;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(ax - hemW / 2 - 6, -10);
  ctx.lineTo(ax + hemW / 2 + 6, -10);
  ctx.lineTo(ax + hemW / 2, hemY);
  ctx.quadraticCurveTo(ax, hemY + h * 0.05, ax - hemW / 2, hemY);
  ctx.closePath();
  ctx.fillStyle = cylinderFill(ctx, ax - hemW / 2, ax + hemW / 2, [62, 64, 72]);
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 6;
  ctx.fill();
  ctx.restore();
  return out;
}

// ---------------- watch ----------------

function principalAngle(c: HTMLCanvasElement): number {
  const a = alphaOf(c);
  const w = c.width, h = c.height;
  let n = 0, mx = 0, my = 0;
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (a[y * w + x]! > 100) { n++; mx += x; my += y; }
  mx /= n || 1; my /= n || 1;
  let sxx = 0, syy = 0, sxy = 0;
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (a[y * w + x]! > 100) {
    sxx += (x - mx) ** 2; syy += (y - my) ** 2; sxy += (x - mx) * (y - my);
  }
  return 0.5 * Math.atan2(2 * sxy, sxx - syy);
}

function largestComponent(c: HTMLCanvasElement): HTMLCanvasElement {
  const w = c.width, h = c.height;
  const ctx0 = c.getContext("2d")!;
  const img = ctx0.getImageData(0, 0, w, h);
  const lab = new Int32Array(w * h);
  let best = 0, bestN = 0, id = 0;
  const st: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (lab[i] || img.data[i * 4 + 3]! < 60) continue;
    id++; let n = 0; st.push(i); lab[i] = id;
    while (st.length) {
      const j = st.pop()!; n++;
      const x = j % w, y = (j / w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const k = ny * w + nx;
        if (!lab[k] && img.data[k * 4 + 3]! >= 60) { lab[k] = id; st.push(k); }
      }
    }
    if (n > bestN) { bestN = n; best = id; }
  }
  for (let i = 0; i < w * h; i++) if (lab[i] && lab[i] !== best) img.data[i * 4 + 3] = 0;
  const out = canvas(w, h);
  out.getContext("2d")!.putImageData(img, 0, 0);
  return trimCutout(out);
}

async function renderWatch(cut0: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  const cut = largestComponent(cut0);
  // strap axis → vertical (strap crosses a horizontal forearm)
  const ang = principalAngle(cut);
  let watch = rotate(cut, Math.PI / 2 - ang);
  const a = alphaOf(watch);
  const w = watch.width, h = watch.height;
  // case = rows where the opaque run is widest
  const rowW: number[] = [];
  for (let y = 0; y < h; y++) {
    let run = 0, best = 0;
    for (let x = 0; x < w; x++) { if (a[y * w + x]! > 100) { run++; if (run > best) best = run; } else run = 0; }
    rowW.push(best);
  }
  const maxW = Math.max(...rowW);
  const caseRows = rowW.map((v, i) => (v > maxW * 0.9 ? i : -1)).filter((i) => i >= 0);
  const caseY = caseRows.length ? (caseRows[0]! + caseRows[caseRows.length - 1]!) / 2 : h / 2;
  const caseD = maxW;

  const armH = S * 0.3;
  const k = (armH * 0.7) / caseD;
  watch = scaled(watch, w * k, h * k);
  const cy = caseY * k;

  const out = canvas(S, S);
  const ctx = out.getContext("2d")!;
  studioBackground(ctx, S * 0.8);
  const armY = S * 0.48;
  const wx = S * 0.47;
  // forearm display form: tapered cylinder, wrist on the right, cut end on the left
  const top = (x: number) => armY - armH / 2 - (1 - x / S) * armH * 0.12;
  const bot = (x: number) => armY + armH / 2 + (1 - x / S) * armH * 0.1;
  const endX = S * 0.86;
  softEllipse(ctx, S * 0.48, bot(S * 0.5) + armH * 0.55, S * 0.42, armH * 0.12, 0.3, 14);
  const armPath = new Path2D();
  armPath.moveTo(-10, top(0));
  armPath.lineTo(endX, top(endX));
  armPath.ellipse(endX, (top(endX) + bot(endX)) / 2, armH * 0.16, (bot(endX) - top(endX)) / 2, 0, -Math.PI / 2, Math.PI / 2);
  armPath.lineTo(-10, bot(0));
  armPath.closePath();
  const g = ctx.createLinearGradient(0, armY - armH * 0.6, 0, armY + armH * 0.6);
  // dark velvet form so light straps keep contrast
  g.addColorStop(0, "rgb(28,28,32)");
  g.addColorStop(0.22, "rgb(78,76,82)");
  g.addColorStop(0.5, "rgb(64,62,68)");
  g.addColorStop(1, "rgb(22,22,26)");
  ctx.fillStyle = g;
  ctx.fill(armPath);

  // watch layer: clipped to the arm (strap wraps behind), edge-darkened
  const layer = canvas(S, S);
  const lctx = layer.getContext("2d")!;
  const t = top(wx), b = bot(wx);
  lctx.drawImage(watch, wx - watch.width / 2, armY - cy);
  lctx.globalCompositeOperation = "source-atop";
  const sg = lctx.createLinearGradient(0, t, 0, b);
  sg.addColorStop(0, "rgba(0,0,0,0.55)");
  sg.addColorStop(0.18, "rgba(0,0,0,0.12)");
  sg.addColorStop(0.5, "rgba(0,0,0,0)");
  sg.addColorStop(0.82, "rgba(0,0,0,0.15)");
  sg.addColorStop(1, "rgba(0,0,0,0.6)");
  lctx.fillStyle = sg;
  lctx.fillRect(0, 0, S, S);
  lctx.globalCompositeOperation = "destination-in";
  lctx.fillStyle = "#000"; // opaque mask — the shading gradient must not thin the watch
  lctx.fill(armPath);
  // shadow of the case on the arm
  softEllipse(ctx, wx + 6, armY + 8, caseD * k * 0.55, caseD * k * 0.5, 0.35, 10);
  ctx.drawImage(layer, 0, 0);
  return out;
}

// ---------------- dress ----------------

async function renderDress(cut: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  const a = alphaOf(cut);
  const w = cut.width, h = cut.height;
  // width of the garment near its top (shoulders)
  let topW = 0, x0Top = 0;
  for (let y = Math.floor(h * 0.04); y < h * 0.12; y++) {
    let x0 = -1, x1 = -1;
    for (let x = 0; x < w; x++) if (a[y * w + x]! > 100) { if (x0 < 0) x0 = x; x1 = x; }
    if (x1 - x0 > topW) { topW = x1 - x0; x0Top = x0; }
  }
  const shoulderW = S * 0.34;
  let k = shoulderW / Math.max(1, topW);
  if (h * k > S * 0.8) k = (S * 0.8) / h;
  const dress = scaled(cut, w * k, h * k);
  const out = canvas(S, S);
  const ctx = out.getContext("2d")!;
  studioBackground(ctx, S * 0.9);
  const cx = S / 2;
  const shoulderY = S * 0.14;
  // stand
  ctx.fillStyle = "#5b544c";
  ctx.fillRect(cx - 5, shoulderY, 10, S * 0.9 - shoulderY);
  softEllipse(ctx, cx, S * 0.92, 80, 10, 0.35, 6);
  ctx.fillStyle = "#4a443e";
  ctx.beginPath();
  ctx.ellipse(cx, S * 0.91, 70, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  // torso form (visible only where the garment does not cover)
  const sw = (topW * k) / 2;
  ctx.beginPath();
  ctx.moveTo(cx - sw * 0.35, shoulderY - 18);
  ctx.quadraticCurveTo(cx - sw, shoulderY - 6, cx - sw, shoulderY + 20);
  ctx.bezierCurveTo(cx - sw * 0.85, shoulderY + 140, cx - sw * 0.7, shoulderY + 170, cx - sw * 0.85, shoulderY + 260);
  ctx.lineTo(cx + sw * 0.85, shoulderY + 260);
  ctx.bezierCurveTo(cx + sw * 0.7, shoulderY + 170, cx + sw * 0.85, shoulderY + 140, cx + sw, shoulderY + 20);
  ctx.quadraticCurveTo(cx + sw, shoulderY - 6, cx + sw * 0.35, shoulderY - 18);
  ctx.closePath();
  ctx.fillStyle = cylinderFill(ctx, cx - sw, cx + sw, [226, 219, 210]);
  ctx.fill();
  // garment
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 8;
  ctx.drawImage(dress, cx - (x0Top * k + sw), shoulderY);
  ctx.restore();
  // neck cap over the neckline
  ctx.fillStyle = cylinderFill(ctx, cx - sw * 0.3, cx + sw * 0.3, [226, 219, 210]);
  ctx.beginPath();
  ctx.ellipse(cx, shoulderY - 16, sw * 0.3, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - sw * 0.22, shoulderY - 60, sw * 0.44, 46);
  ctx.fillStyle = "#3e3a35";
  ctx.beginPath();
  ctx.ellipse(cx, shoulderY - 60, sw * 0.24, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  return out;
}

// ---------------- plinth (other) ----------------

async function renderPlinth(cut: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  const out = canvas(S, S);
  const ctx = out.getContext("2d")!;
  studioBackground(ctx, S * 0.78);
  const pw = S * 0.5, py = S * 0.66;
  ctx.fillStyle = cylinderFill(ctx, S / 2 - pw / 2, S / 2 + pw / 2, [232, 226, 218]);
  ctx.fillRect(S / 2 - pw / 2, py, pw, S - py);
  ctx.fillStyle = "#f1ece6";
  ctx.beginPath();
  ctx.ellipse(S / 2, py, pw / 2, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  const maxH = S * 0.5, maxW = pw * 0.85;
  const k = Math.min(maxH / cut.height, maxW / cut.width);
  const p = scaled(cut, cut.width * k, cut.height * k);
  softEllipse(ctx, S / 2, py + 2, p.width * 0.48, 10, 0.4, 6);
  ctx.drawImage(p, S / 2 - p.width / 2, py + 6 - p.height);
  return out;
}

export async function renderWornFrame(cutoutSrc: string, kind: ProductKind): Promise<string> {
  if (kind === "bottle") return renderInHandScene(cutoutSrc);
  const cut = trimCutout(await loadImage(cutoutSrc));
  const out =
    kind === "shoe" ? await renderShoe(cut)
    : kind === "watch" ? await renderWatch(cut)
    : kind === "dress" ? await renderDress(cut)
    : await renderPlinth(cut);
  return out.toDataURL("image/jpeg", 0.92);
}
