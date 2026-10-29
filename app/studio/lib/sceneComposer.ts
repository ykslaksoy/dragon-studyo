/**
 * Free canvas scene composer — ported from research PR #10
 * (research/provider-test/scripts/run_app_scenarios.py + composite_utils.py).
 * Per-frame crop / zoom / angle / background / shadow — no generative API.
 */

import type { Purpose, FrameSpec } from "./catalog";

export type SceneSize = { w: number; h: number };

type Transform = {
  scale: number;
  rotate: number;
  ox: number;
  oy: number;
  crop: number;
  wide?: boolean;
};

function purposePalette(
  purpose: Purpose,
): { top: [number, number, number]; bottom: [number, number, number] } {
  if (purpose === "marketplace" || purpose === "multi-angle") {
    return { top: [252, 252, 253], bottom: [235, 236, 238] };
  }
  if (purpose === "live") {
    return { top: [255, 238, 220], bottom: [255, 210, 175] };
  }
  if (purpose === "creator") {
    return { top: [248, 250, 255], bottom: [220, 228, 245] };
  }
  return { top: [28, 30, 42], bottom: [12, 14, 24] };
}

function angleTransform(angle: string | null): Transform {
  if (!angle) {
    return { scale: 0.72, rotate: 0, ox: 0, oy: 0, crop: 1 };
  }
  const mapping: Record<string, Transform> = {
    Ön: { scale: 0.74, rotate: 0, ox: 0, oy: 0.02, crop: 1 },
    "3/4": { scale: 0.7, rotate: -10, ox: -0.06, oy: 0.03, crop: 1 },
    Üst: { scale: 0.62, rotate: -28, ox: 0, oy: 0.08, crop: 0.95 },
    Makro: { scale: 0.95, rotate: 0, ox: 0, oy: 0, crop: 0.45 },
    "Düşük açı": { scale: 0.78, rotate: 6, ox: 0, oy: -0.08, crop: 1 },
  };
  return mapping[angle] ?? { scale: 0.72, rotate: 0, ox: 0, oy: 0, crop: 1 };
}

function frameTransform(base: string): Transform & {
  scale_mul: number;
  rotate_add: number;
} {
  const b = base.toLowerCase();
  const t = {
    scale: 0.72,
    rotate: 0,
    ox: 0,
    oy: 0,
    crop: 1,
    wide: false,
    scale_mul: 1,
    rotate_add: 0,
  };
  if (b.includes("45") || base.includes("45°")) {
    t.rotate_add = -8;
    t.ox = -0.04;
  }
  if (
    b.includes("detay") ||
    b.includes("makro") ||
    b.includes("texture") ||
    b.includes("yakın") ||
    b.includes("doku") ||
    b.includes("dikiş")
  ) {
    t.crop = 0.42;
    t.scale_mul = 1.15;
  }
  if (b.includes("flat lay")) {
    t.rotate_add = -32;
    t.oy = 0.06;
    t.scale_mul = 0.85;
  }
  if (b.includes("mobil") || b.includes("thumbnail")) {
    t.crop = 0.88;
    t.scale_mul = 0.9;
  }
  if (
    b.includes("cta") ||
    b.includes("caption") ||
    b.includes("a+") ||
    b.includes("negatif") ||
    b.includes("negative")
  ) {
    t.ox = -0.18;
    t.scale_mul = 0.65;
  }
  if (
    b.includes("cinematic") ||
    b.includes("mood") ||
    b.includes("dramatic") ||
    b.includes("koyu")
  ) {
    t.wide = true;
    t.scale_mul = 0.55;
    t.oy = 0.05;
  }
  if (b.includes("abstract")) {
    t.crop = 0.35;
    t.rotate_add = 12;
  }
  if (b.includes("hook") || b.includes("end card")) {
    t.ox = 0.15;
    t.scale_mul = 0.6;
  }
  if (b.includes("multi-angle") || b.includes("yan profil")) {
    t.rotate_add = 14;
    t.crop = 0.8;
  }
  if (b.includes("3/4 sol")) {
    t.rotate_add = -12;
    t.ox = -0.08;
  }
  if (b.includes("3/4 sağ")) {
    t.rotate_add = 12;
    t.ox = 0.08;
  }
  if (b.includes("arka")) {
    t.rotate_add = 18;
    t.scale_mul = 0.7;
  }
  if (b.includes("üst bakış")) {
    t.rotate_add = -30;
    t.oy = 0.1;
    t.crop = 0.9;
  }
  if (b.includes("düşük açı")) {
    t.rotate_add = 8;
    t.oy = -0.1;
  }
  if (b.includes("varyant")) {
    t.scale_mul = 0.5;
    t.ox = -0.22;
  }
  if (b.includes("ölçek")) {
    t.scale_mul = 0.55;
    t.oy = 0.08;
  }
  if (b.includes("gölge")) {
    t.scale_mul = 0.68;
    t.oy = 0.04;
  }
  if (b.includes("aydınlık")) {
    t.scale_mul = 0.7;
  }
  return t;
}

function fillGradient(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  top: [number, number, number],
  bottom: [number, number, number],
) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, `rgb(${top.join(",")})`);
  g.addColorStop(1, `rgb(${bottom.join(",")})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawVignette(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  strength = 0.28,
) {
  const g = ctx.createRadialGradient(
    w / 2,
    h / 2,
    Math.min(w, h) * 0.2,
    w / 2,
    h / 2,
    Math.max(w, h) * 0.75,
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawFloorPlane(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  yFrac: number,
) {
  const fy = h * yFrac;
  ctx.fillStyle = "rgba(0,0,0,0.07)";
  ctx.beginPath();
  ctx.ellipse(w * 0.5, fy + 30, w * 0.35, 50, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.05)";
  ctx.fillRect(0, fy, w, h - fy);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Görsel yüklenemedi"));
    img.src = src;
  });
}

function cropImage(
  img: HTMLImageElement | HTMLCanvasElement,
  crop: number,
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  const w = img.width;
  const h = img.height;
  const cw = Math.max(1, Math.floor(w * crop));
  const ch = Math.max(1, Math.floor(h * crop));
  const left = Math.floor((w - cw) / 2);
  const top = Math.floor((h - ch) / 2);
  c.width = cw;
  c.height = ch;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, left, top, cw, ch, 0, 0, cw, ch);
  return c;
}

function featherAlpha(
  src: HTMLCanvasElement | HTMLImageElement,
  radius = 1,
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(src, 0, 0);
  if (radius <= 0) return c;
  // Soft edge via slight blur on a copy composited — keep RGB sharp-ish
  ctx.globalCompositeOperation = "destination-in";
  ctx.filter = `blur(${radius}px)`;
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  ctx.globalCompositeOperation = "source-over";
  return c;
}

function drawContactShadow(
  ctx: CanvasRenderingContext2D,
  prod: HTMLCanvasElement,
  x: number,
  y: number,
  blur: number,
  opacity: number,
  dx: number,
  dy: number,
) {
  ctx.save();
  ctx.shadowColor = `rgba(0,0,0,${opacity})`;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = dx;
  ctx.shadowOffsetY = dy;
  ctx.globalAlpha = 0.9;
  ctx.drawImage(prod, x, y);
  ctx.restore();
}

/**
 * Render one scenario frame from a cutout (RGBA data URL or image URL).
 */
export async function renderSceneFrame(
  cutoutSrc: string,
  purpose: Purpose,
  spec: FrameSpec,
  size: SceneSize = { w: 720, h: 720 },
): Promise<string> {
  let W = size.w;
  let H = size.h;
  const ft = frameTransform(spec.baseFrame);
  if (ft.wide) {
    W = 960;
    H = 540;
  }

  let top = purposePalette(purpose).top;
  let bottom = purposePalette(purpose).bottom;
  if (spec.realism === "needs_gen_ai" && purpose === "artistic") {
    top = [35, 32, 48];
    bottom = [10, 8, 18];
  }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  fillGradient(ctx, W, H, top, bottom);
  drawVignette(ctx, W, H, purpose === "artistic" ? 0.4 : 0.22);
  drawFloorPlane(ctx, W, H, purpose === "artistic" ? 0.88 : 0.82);

  const cutout = await loadImage(cutoutSrc);
  const at = angleTransform(spec.angleLabel);
  const crop = Math.min(at.crop, ft.crop);
  const scale = at.scale * ft.scale_mul;
  const rotate = at.rotate + ft.rotate_add;
  const ox = at.ox + ft.ox;
  const oy = at.oy + ft.oy;

  let prod: HTMLCanvasElement | HTMLImageElement = cutout;
  if (crop < 0.99) {
    prod = cropImage(cutout, crop);
  }
  prod = featherAlpha(prod, 1);

  const targetH = Math.max(80, Math.min(Math.floor(H * scale), Math.floor(H * 0.92)));
  const ratio = targetH / prod.height;
  const nw = Math.max(1, Math.floor(prod.width * ratio));
  const nh = targetH;

  const scaled = document.createElement("canvas");
  scaled.width = nw;
  scaled.height = nh;
  scaled.getContext("2d")!.drawImage(prod, 0, 0, nw, nh);

  let drawable: HTMLCanvasElement = scaled;
  if (Math.abs(rotate) > 0.1) {
    const rad = (rotate * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    const rw = Math.ceil(nw * cos + nh * sin);
    const rh = Math.ceil(nw * sin + nh * cos);
    const rot = document.createElement("canvas");
    rot.width = rw;
    rot.height = rh;
    const rctx = rot.getContext("2d")!;
    rctx.translate(rw / 2, rh / 2);
    rctx.rotate(rad);
    rctx.drawImage(scaled, -nw / 2, -nh / 2);
    drawable = rot;
  }

  let px = Math.floor(W * (0.5 + ox) - drawable.width / 2);
  let py = Math.floor(H * (0.56 + oy) - drawable.height / 2);
  px = Math.max(10, Math.min(px, W - drawable.width - 10));
  py = Math.max(10, Math.min(py, H - drawable.height - 10));

  // Soft cast shadow then product
  drawContactShadow(ctx, drawable, px, py, 18, 0.28, 14, 18);
  drawContactShadow(ctx, drawable, px, py, 4, 0.45, 2, 4);
  ctx.drawImage(drawable, px, py);

  const baseLower = spec.baseFrame.toLowerCase();
  if (baseLower.includes("cta") || baseLower.includes("caption")) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    roundRect(ctx, W - 280, H - 100, 240, 56, 14);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "600 13px system-ui,sans-serif";
    ctx.fillText("CTA / yazı alanı", W - 260, H - 66);
  }

  if (spec.realism === "needs_gen_ai") {
    ctx.fillStyle = "rgba(120,30,30,0.85)";
    ctx.fillRect(8, 8, W - 16, 40);
    ctx.fillStyle = "#ffdcdc";
    ctx.font = "600 12px system-ui,sans-serif";
    ctx.fillText(
      "[GEN]: FAL_KEY yok — tuval yer tutucu (mannequin/warp ayrı yol)",
      16,
      34,
    );
  } else if (spec.realism === "canvas_sim") {
    ctx.fillStyle = "rgba(30,30,30,0.7)";
    ctx.fillRect(8, H - 36, W - 16, 28);
    ctx.fillStyle = "#d2d2d2";
    ctx.font = "11px system-ui,sans-serif";
    ctx.fillText("Tuval simülasyonu — gerçek yeni açı/sahne değil", 16, H - 16);
  }

  return canvas.toDataURL("image/jpeg", 0.88);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
