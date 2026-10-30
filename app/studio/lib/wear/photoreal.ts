/**
 * Photoreal worn / held frames for the free path (no FAL_KEY).
 *
 * Every frame is a real, licensed stock photo (Unsplash License, see
 * research/provider-test/sources/mannequin_stock.json) with the original
 * product removed offline (public/wear/*), and the user's cutout
 * (BiRefNet / ISNet — never u2net / RMBG-2.0) warped into the body part:
 *
 *  - shoe  → foot_scene.jpg: sole levelled, heel/toe orientation matched,
 *            rotated to the stock foot pitch, the real sock (foot_sock.png)
 *            is re-layered so it dips into the collar opening (occlusion),
 *            LAB-ish tone match to the scene, ambient + ground shadow.
 *  - watch → wrist_scene.jpg: strap axis turned across the forearm, case
 *            on the top of the wrist, strap clipped to the real arm
 *            silhouette (wraps behind), edge falloff + case shadow on skin.
 *  - bottle→ hand stock with the real fingers re-drawn over the product.
 *  - dress / other → null: there is no honest free worn frame; the caller
 *            falls back to a studio frame and labels it (needs FAL_KEY/VTON).
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

export function guessKind(fileName: string, aspect: number): ProductKind {
  const n = fileName.toLowerCase();
  if (/sneaker|shoe|ayakkab|boot|terlik|sandal/.test(n)) return "shoe";
  if (/watch|saat|bileklik|bracelet/.test(n)) return "watch";
  if (/perfume|parf|skincare|krem|cream|serum|bottle|şişe|kozmetik/.test(n)) return "bottle";
  if (/dress|elbise|gömlek|shirt|ceket|jacket|etek|skirt|lace|dantel/.test(n)) return "dress";
  if (aspect > 1.35) return "shoe";
  return "other";
}

type Pt = [number, number];
const OUT = 720;

function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = document.createElement("img");
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("görsel yüklenemedi: " + src.slice(0, 60)));
    i.src = src;
  });
}

function alphaOf(c: HTMLCanvasElement): Uint8ClampedArray {
  const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
  const a = new Uint8ClampedArray(c.width * c.height);
  for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3]!;
  return a;
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

function flipX(src: HTMLCanvasElement): HTMLCanvasElement {
  const out = canvas(src.width, src.height);
  const ctx = out.getContext("2d")!;
  ctx.translate(src.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(src, 0, 0);
  return out;
}

function scaled(src: HTMLCanvasElement, k: number): HTMLCanvasElement {
  const out = canvas(src.width * k, src.height * k);
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, out.width, out.height);
  return out;
}

function polyPath(pts: Pt[]): Path2D {
  const p = new Path2D();
  pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  p.closePath();
  return p;
}

/** Mean/std transfer in a Lab-like space (luma + 2 opponent channels). */
function toneMatch(prod: HTMLCanvasElement, scene: HTMLCanvasElement, r: [number, number, number, number], strength: number): HTMLCanvasElement {
  const sd = scene.getContext("2d")!.getImageData(r[0], r[1], r[2], r[3]).data;
  const out = canvas(prod.width, prod.height);
  const octx = out.getContext("2d")!;
  octx.drawImage(prod, 0, 0);
  const pd = octx.getImageData(0, 0, out.width, out.height);
  const lab = (R: number, G: number, B: number) => [0.299 * R + 0.587 * G + 0.114 * B, R - G, (R + G) / 2 - B];
  const stats = (d: Uint8ClampedArray, useA: boolean) => {
    const m = [0, 0, 0], s = [0, 0, 0];
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (useA && d[i + 3]! < 200) continue;
      const v = lab(d[i]!, d[i + 1]!, d[i + 2]!);
      for (let k = 0; k < 3; k++) { m[k] += v[k]!; s[k] += v[k]! * v[k]!; }
      n++;
    }
    n = n || 1;
    return m.map((v, k) => [v / n, Math.sqrt(Math.max(1, s[k]! / n - (v / n) ** 2))]);
  };
  const S = stats(sd, false), P = stats(pd.data, true);
  const d = pd.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const v = lab(d[i]!, d[i + 1]!, d[i + 2]!);
    // luma: shift mean only partially (keep product contrast); chroma: cast toward scene
    const L = v[0]! + (S[0]![0]! - P[0]![0]!) * strength * 0.6;
    const a = v[1]! + (S[1]![0]! - P[1]![0]!) * strength * 0.5;
    const b = v[2]! + (S[2]![0]! - P[2]![0]!) * strength * 0.5;
    // inverse: R = g + a ; B = (R + g) / 2 - b ; L = .299R + .587g + .114B
    const g = L - 0.299 * a - 0.114 * (a / 2 - b);
    const R = g + a, Bv = (R + g) / 2 - b;
    d[i] = Math.max(0, Math.min(255, R));
    d[i + 1] = Math.max(0, Math.min(255, g));
    d[i + 2] = Math.max(0, Math.min(255, Bv));
  }
  octx.putImageData(pd, 0, 0);
  return out;
}

function largestComponent(c: HTMLCanvasElement): HTMLCanvasElement {
  const w = c.width, h = c.height;
  const img = c.getContext("2d")!.getImageData(0, 0, w, h);
  const lab = new Int32Array(w * h);
  let best = 0, bestN = 0, id = 0;
  const st: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (lab[i] || img.data[i * 4 + 3]! < 60) continue;
    id++; let n = 0; st.push(i); lab[i] = id;
    while (st.length) {
      const j = st.pop()!; n++;
      const x = j % w, y = (j / w) | 0;
      if (x > 0 && !lab[j - 1] && img.data[(j - 1) * 4 + 3]! >= 60) { lab[j - 1] = id; st.push(j - 1); }
      if (x < w - 1 && !lab[j + 1] && img.data[(j + 1) * 4 + 3]! >= 60) { lab[j + 1] = id; st.push(j + 1); }
      if (y > 0 && !lab[j - w] && img.data[(j - w) * 4 + 3]! >= 60) { lab[j - w] = id; st.push(j - w); }
      if (y < h - 1 && !lab[j + w] && img.data[(j + w) * 4 + 3]! >= 60) { lab[j + w] = id; st.push(j + w); }
    }
    if (n > bestN) { bestN = n; best = id; }
  }
  for (let i = 0; i < w * h; i++) if (lab[i] && lab[i] !== best) img.data[i * 4 + 3] = 0;
  const out = canvas(w, h);
  out.getContext("2d")!.putImageData(img, 0, 0);
  return trimCutout(out);
}

function label(ctx: CanvasRenderingContext2D, text: string) {
  ctx.fillStyle = "rgba(20,20,24,0.72)";
  ctx.fillRect(0, OUT - 26, OUT, 26);
  ctx.fillStyle = "#dcffc8";
  ctx.font = "600 11px system-ui,sans-serif";
  ctx.fillText(text, 12, OUT - 9);
}

// ---------------- shoe on a real foot ----------------

function soleAngle(prod: HTMLCanvasElement): number {
  const a = alphaOf(prod);
  const w = prod.width, h = prod.height;
  const bot: Pt[] = [];
  for (let x = 0; x < w; x += 2) for (let y = h - 1; y >= 0; y--) if (a[y * w + x]! > 80) { bot.push([x, y]); break; }
  if (bot.length < 10) return 0;
  const x0 = bot[0]![0], span = bot[bot.length - 1]![0] - x0;
  let best = 0, bestScore = Infinity;
  for (let d = -50; d <= 50; d += 0.5) {
    const t = (d * Math.PI) / 180, c = Math.cos(t), sn = Math.sin(t);
    let L = -Infinity, R = -Infinity;
    for (const [x, y] of bot) {
      const ry = x * sn + y * c;
      if (x < x0 + span * 0.4) L = Math.max(L, ry);
      else if (x > x0 + span * 0.6) R = Math.max(R, ry);
    }
    const sc = Math.abs(L - R);
    if (sc < bestScore) { bestScore = sc; best = t; }
  }
  return best;
}

function topProfile(c: HTMLCanvasElement): number[] {
  const a = alphaOf(c), w = c.width, h = c.height;
  const t: number[] = [];
  for (let x = 0; x < w; x++) { let v = h; for (let y = 0; y < h; y++) if (a[y * w + x]! > 80) { v = y; break; } t.push(v); }
  return t;
}

// stock geometry (foot_scene.jpg = 1400×1400 crop of the original at y+250)
const FOOT = {
  W: 1400,
  pitch: (20 * Math.PI) / 180, // heel high-left → toe low-right
  length: 980,                 // heel-to-toe of the original shoe
  collar: [730, 590] as Pt,    // where the sock enters the shoe
  sockAt: [514, 65] as Pt,     // foot_sock.png offset in scene coords
  ground: 1330,
};

async function renderShoe(cutSrc: string): Promise<string> {
  const [scene, sock, cutImg] = await Promise.all([
    loadImage("/wear/foot_scene.jpg"),
    loadImage("/wear/foot_sock.png"),
    loadImage(cutSrc),
  ]);
  let shoe = trimCutout(cutImg);
  const t0 = soleAngle(shoe);
  if (Math.abs(t0) > 0.02) shoe = rotate(shoe, t0);
  // heel side = side with the collar (highest top point); the stock heel is left
  let prof = topProfile(shoe);
  const minTop = Math.min(...prof);
  const hi = prof.map((v, x) => (v < minTop + shoe.height * 0.12 ? x : -1)).filter((x) => x >= 0);
  const collarX0 = (hi[0]! + hi[hi.length - 1]!) / 2;
  if (collarX0 > shoe.width / 2) shoe = flipX(shoe);
  shoe = scaled(shoe, FOOT.length / shoe.width);
  prof = topProfile(shoe);
  const mt = Math.min(...prof);
  const hi2 = prof.map((v, x) => (v < mt + shoe.height * 0.12 ? x : -1)).filter((x) => x >= 0);
  const cx = (hi2[0]! + hi2[hi2.length - 1]!) / 2;
  const cy = mt + shoe.height * 0.06; // just inside the opening

  const W = FOOT.W;
  const base = canvas(W, W);
  const b = base.getContext("2d")!;
  b.drawImage(scene, 0, 0, W, W);
  shoe = toneMatch(shoe, base, [200, 700, 1000, 500], 0.55);

  // the shoe layer in scene coords (rotation about the collar point)
  const layer = canvas(W, W);
  const l = layer.getContext("2d")!;
  l.translate(FOOT.collar[0], FOOT.collar[1]);
  l.rotate(FOOT.pitch);
  l.drawImage(shoe, -cx, -cy);
  l.setTransform(1, 0, 0, 1, 0, 0);
  // scene light: cool key from the right, falloff to the heel
  l.globalCompositeOperation = "source-atop";
  const g = l.createLinearGradient(200, 0, 1250, 0);
  g.addColorStop(0, "rgba(5,8,25,0.38)");
  g.addColorStop(0.6, "rgba(20,30,70,0.10)");
  g.addColorStop(1, "rgba(120,140,200,0.06)");
  l.fillStyle = g;
  l.fillRect(0, 0, W, W);
  l.globalCompositeOperation = "source-over";

  // ground shadow (foot is lifted mid-step → soft, distant)
  b.save();
  b.filter = "blur(28px)";
  b.globalAlpha = 0.55;
  b.fillStyle = "#000";
  b.beginPath();
  b.ellipse(720, FOOT.ground, 430, 38, 0, 0, Math.PI * 2);
  b.fill();
  b.restore();

  // sock under the shoe (already in the scene), then shoe
  b.drawImage(layer, 0, 0);

  // occlusion: the real sock dips into the collar opening, over the shoe's
  // top edge band only — mask = sock ∩ (shoe shifted down by d)
  const d = 26;
  const sockL = canvas(W, W);
  const s = sockL.getContext("2d")!;
  s.drawImage(sock, FOOT.sockAt[0], FOOT.sockAt[1]);
  s.globalCompositeOperation = "destination-out";
  s.drawImage(layer, 0, d); // keep sock only above (shoe top + d)
  s.globalCompositeOperation = "source-over";
  b.drawImage(sockL, 0, 0);
  // inner-collar contact shadow on the sock
  const shL = canvas(W, W);
  const sh = shL.getContext("2d")!;
  sh.drawImage(sock, FOOT.sockAt[0], FOOT.sockAt[1]);
  sh.globalCompositeOperation = "source-in";
  const sg = sh.createLinearGradient(0, FOOT.collar[1] - 90, 0, FOOT.collar[1] + 40);
  sg.addColorStop(0, "rgba(0,0,0,0)");
  sg.addColorStop(1, "rgba(0,0,0,0.55)");
  sh.fillStyle = sg;
  sh.fillRect(0, 0, W, W);
  sh.globalCompositeOperation = "destination-out";
  sh.drawImage(layer, 0, d);
  b.drawImage(shL, 0, 0);

  // film grain so the product matches the photo's noise
  grain(b, W, W, 5);

  const out = canvas(OUT, OUT);
  const o = out.getContext("2d")!;
  o.drawImage(base, 0, 0, OUT, OUT);
  label(o, "Giyili — gerçek ayak fotoğrafı + ürün kompoziti (stok: Unsplash) · insan modelde deneme için FAL_KEY/VTON");
  return out.toDataURL("image/jpeg", 0.92);
}

function grain(ctx: CanvasRenderingContext2D, w: number, h: number, amt: number) {
  const n = canvas(256, 256);
  const nc = n.getContext("2d")!;
  const id = nc.createImageData(256, 256);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * amt * 8;
    id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
    id.data[i + 3] = 255;
  }
  nc.putImageData(id, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = ctx.createPattern(n, "repeat")!;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// ---------------- watch on a real wrist ----------------

// wrist_scene.jpg = 933×933 crop (x−300) of the original
const WRIST = {
  // wrist2_scene.jpg: Pexels 8092768 (Kaboompics, Pexels License), crop
  // x220–820 / y1400–2000 → 933². Bare forearm seen from above, plain wall:
  // the strap crosses the wrist and disappears behind BOTH silhouettes.
  W: 933,
  scene: "/wear/wrist2_scene.jpg",
  arm: [[385, 560], [379, 620], [358, 700], [345, 740], [332, 780], [319, 820], [304, 860], [285, 933], [580, 933], [581, 820], [592, 780], [599, 740], [611, 700], [652, 660], [700, 620], [700, 560]] as Pt[],
  strapRot: (-72.8 * Math.PI) / 180, // vertical strap → across the forearm
  caseAt: [470, 755] as Pt,
  caseD: 160,
  flatC: 45,  // flat part of the band under the case
  wrapR: 80,  // flatC + wrapR ≈ half wrist width (≈122 px)
  toneRect: [400, 680, 160, 120] as [number, number, number, number],
};

function principalAngle(c: HTMLCanvasElement): number {
  const a = alphaOf(c), w = c.width, h = c.height;
  let n = 0, mx = 0, my = 0;
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (a[y * w + x]! > 100) { n++; mx += x; my += y; }
  mx /= n || 1; my /= n || 1;
  let sxx = 0, syy = 0, sxy = 0;
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (a[y * w + x]! > 100) {
    sxx += (x - mx) ** 2; syy += (y - my) ** 2; sxy += (x - mx) * (y - my);
  }
  return 0.5 * Math.atan2(2 * sxy, sxx - syy);
}

function wrapCylinder(src: HTMLCanvasElement, cy: number, c: number, R: number): { c: HTMLCanvasElement; cy: number } {
  const half = Math.ceil(c + R);
  const out = canvas(src.width, half * 2);
  const o = out.getContext("2d")!;
  for (let j = 0; j < half * 2; j++) {
    const dp = j - half;
    const a = Math.abs(dp);
    let d = dp, shade = 0, bend = 0;
    if (a > c) {
      const t = Math.min(0.999, (a - c) / R);
      const th = Math.asin(t);
      d = Math.sign(dp) * (c + R * th);
      shade = 1 - Math.cos(th);
      bend = 0.16 * R * (1 - Math.cos(th)); // oblique view of the band → elliptic arc
    }
    const sy = cy + d;
    if (sy < 0 || sy >= src.height) continue;
    o.drawImage(src, 0, sy, src.width, 1, -bend, j, src.width, 1);
    if (shade > 0) {
      o.save();
      o.globalCompositeOperation = "source-atop";
      o.fillStyle = `rgba(28,16,8,${Math.min(0.92, 1.1 * Math.pow(shade, 0.6)).toFixed(3)})`;
      o.fillRect(0, j, src.width, 1);
      o.restore();
    }
  }
  return { c: out, cy: half };
}

async function renderWatch(cutSrc: string): Promise<string> {
  const [scene, cutImg] = await Promise.all([loadImage(WRIST.scene), loadImage(cutSrc)]);
  const W = WRIST.W;
  let watch = largestComponent(trimCutout(cutImg));
  watch = rotate(watch, Math.PI / 2 - principalAngle(watch)); // strap vertical
  const a = alphaOf(watch);
  const w = watch.width, h = watch.height;
  const rowW: number[] = [];
  for (let y = 0; y < h; y++) {
    let run = 0, best = 0;
    for (let x = 0; x < w; x++) { if (a[y * w + x]! > 100) { run++; if (run > best) best = run; } else run = 0; }
    rowW.push(best);
  }
  const maxW = Math.max(...rowW);
  const rows = rowW.map((v, i) => (v > maxW * 0.9 ? i : -1)).filter((i) => i >= 0);
  const caseY = (rows[0]! + rows[rows.length - 1]!) / 2;
  // horizontal centre of the case = centre of the widest run on the case row
  let caseX = w / 2;
  {
    const y = Math.round(caseY);
    let run = 0, best = 0, end = 0;
    for (let x = 0; x < w; x++) { if (a[y * w + x]! > 100) { run++; if (run > best) { best = run; end = x; } } else run = 0; }
    caseX = end - best / 2;
  }
  const k = WRIST.caseD / maxW;
  watch = scaled(watch, k);

  const base = canvas(W, W);
  const b = base.getContext("2d")!;
  b.drawImage(scene, 0, 0, W, W);
  watch = toneMatch(watch, base, WRIST.toneRect, 0.4);

  const arm = polyPath(WRIST.arm);
  const rot = WRIST.strapRot + Math.PI / 2; // strap direction (⟂ forearm)
  const layer = canvas(W, W);
  const l = layer.getContext("2d")!;
  l.translate(WRIST.caseAt[0], WRIST.caseAt[1]);
  l.rotate(WRIST.strapRot);
  // wrap-around: project the flat strap onto the wrist cylinder. Rows beyond
  // the case are compressed d' = c + R·sin((d−c)/R) and shaded by the surface
  // normal, so the strap visibly curves away and disappears behind the wrist
  // (everything past θ = 90° is on the hidden side and is dropped).
  const wrapped = wrapCylinder(watch, caseY * k, WRIST.flatC, WRIST.wrapR);
  l.drawImage(wrapped.c, -caseX * k, -wrapped.cy);
  l.setTransform(1, 0, 0, 1, 0, 0);
  // strap falls off toward the arm edges (curvature), warm key from the left
  l.globalCompositeOperation = "source-atop";
  const nx = Math.cos(rot), ny = Math.sin(rot);
  const half = 190;
  const g = l.createLinearGradient(WRIST.caseAt[0] - nx * half, WRIST.caseAt[1] - ny * half, WRIST.caseAt[0] + nx * half, WRIST.caseAt[1] + ny * half);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.3, "rgba(0,0,0,0.0)");
  g.addColorStop(0.7, "rgba(0,0,0,0.0)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  l.fillStyle = g;
  l.fillRect(0, 0, W, W);
  // occlusion: strap wraps behind the wrist → keep only inside the real arm;
  // the case itself sits on top of the wrist and may overhang the outline
  // occlusion with strap thickness: the band stands ~T px off the skin, so at
  // the silhouette it continues a little past the outline and turns away
  // (edge-on far-side segment) instead of being cut flush with the skin.
  const T = 9;
  l.globalCompositeOperation = "destination-in";
  l.fillStyle = "#000";
  const keep = new Path2D();
  keep.arc(WRIST.caseAt[0], WRIST.caseAt[1], WRIST.caseD * 0.56, 0, Math.PI * 2);
  const km = canvas(W, W);
  const kc = km.getContext("2d")!;
  kc.fill(arm); // separate fills: polygon winding must not punch a hole
  kc.fill(keep);
  kc.lineJoin = "round";
  kc.lineWidth = T * 2;
  kc.stroke(arm);
  l.filter = "blur(1.5px)"; // soft, rounded far edge instead of a cut
  l.drawImage(km, 0, 0);
  l.filter = "none";
  // edge-on rim / turning band: dark, rounded falloff across the silhouette
  l.globalCompositeOperation = "source-atop";
  l.filter = "blur(3px)";
  l.strokeStyle = "rgba(25,15,8,0.75)";
  l.lineWidth = T * 2.2;
  l.stroke(arm);
  l.filter = "none";
  l.globalCompositeOperation = "source-over";

  // contact shadow of case + strap on the skin
  b.save();
  b.clip(arm);
  b.filter = "blur(10px)";
  b.globalAlpha = 0.5;
  const sil = canvas(W, W);
  const sc = sil.getContext("2d")!;
  sc.drawImage(layer, 0, 0);
  sc.globalCompositeOperation = "source-in";
  sc.fillStyle = "#2a1408";
  sc.fillRect(0, 0, W, W);
  b.drawImage(sil, 10, 14);
  b.restore();

  b.drawImage(layer, 0, 0);
  grain(b, W, W, 4);
  const out = canvas(OUT, OUT);
  const o = out.getContext("2d")!;
  o.drawImage(base, 0, 0, OUT, OUT);
  label(o, "Giyili — gerçek bilek fotoğrafı + ürün kompoziti (stok: Pexels) · insan modelde deneme için FAL_KEY/VTON");
  return out.toDataURL("image/jpeg", 0.92);
}

/**
 * Photoreal worn/held frame, or null when the free pipeline cannot do it
 * honestly (dress / other → caller uses a studio frame + "needs FAL_KEY").
 */
export async function renderWornFrame(cutoutSrc: string, kind: ProductKind): Promise<string | null> {
  if (kind === "shoe") return renderShoe(cutoutSrc);
  if (kind === "watch") return renderWatch(cutoutSrc);
  if (kind === "bottle") return renderInHandScene(cutoutSrc);
  return null;
}
