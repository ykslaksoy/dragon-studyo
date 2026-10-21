/**
 * Client-side dekupe (background removal).
 * - Fast preview: ISNet (xrds/isnet-general-onnx-int8, MIT / DIS Apache lineage)
 * - Final: BiRefNet lite 512 (studioludens/birefnet-lite-512, MIT)
 * - u2net BANNED; BRIA RMBG-2.0 BANNED
 * No separate server; optional /api/dekupe can wrap this later.
 */

import {
  applyMaskToRgb,
  extractAlphaMask,
  guardedHybrid,
  imageDataFromUrl,
  imageDataToDataUrl,
  morphHoleFill,
  refineAlphaEdges,
  suppressGreenSpill,
} from "./postprocess";

export type DekupeQuality = "preview" | "final";

export type DekupeProgress = {
  stage:
    | "loading-isnet"
    | "loading-birefnet"
    | "running-isnet"
    | "running-birefnet"
    | "postprocess"
    | "done";
  message: string;
  pct: number;
};

export type DekupeResult = {
  cutoutDataUrl: string;
  previewDataUrl: string | null;
  usedHybrid: boolean;
  quality: DekupeQuality;
  modelNotes: string[];
};

export type PaidFallbackProvider = "photoroom" | "remove.bg";

/** Design-only: optional hard-SKU paid fallback — not wired (no free-quota dependency). */
export type PaidFallbackDesign = {
  enabled: false;
  providers: PaidFallbackProvider[];
  note: string;
};

export const PAID_FALLBACK_DESIGN: PaidFallbackDesign = {
  enabled: false,
  providers: ["photoroom", "remove.bg"],
  note:
    "Zor SKU (beyaz-üzeri-beyaz, dantel, kürk) için ücretli API opsiyonel; çekirdek yol BiRefNet (MIT).",
};

type AnyModel = {
  (inputs: Record<string, unknown>): Promise<Record<string, unknown>> | Record<string, unknown>;
};

type Processor = (image: unknown) => Promise<{ pixel_values: unknown }> | { pixel_values: unknown };

let isnetPipe: ((input: string | Blob) => Promise<unknown>) | null = null;
let birefModel: AnyModel | null = null;
let birefProcessor: Processor | null = null;
let loadIsnetPromise: Promise<void> | null = null;
let loadBirefPromise: Promise<void> | null = null;

async function envDevice(): Promise<"webgpu" | "wasm"> {
  try {
    // @ts-expect-error webgpu optional
    if (typeof navigator !== "undefined" && navigator.gpu) {
      // @ts-expect-error webgpu optional
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) return "webgpu";
    }
  } catch {
    /* fall through */
  }
  return "wasm";
}

async function ensureIsnet(
  onProgress?: (p: DekupeProgress) => void,
): Promise<void> {
  if (isnetPipe) return;
  if (!loadIsnetPromise) {
    loadIsnetPromise = (async () => {
      onProgress?.({
        stage: "loading-isnet",
        message: "ISNet modeli yükleniyor (hızlı önizleme)…",
        pct: 8,
      });
      const { pipeline } = await import("@huggingface/transformers");
      const device = await envDevice();
      isnetPipe = (await pipeline(
        "background-removal",
        "xrds/isnet-general-onnx-int8",
        {
          device,
          dtype: device === "webgpu" ? "q8" : "fp32",
        },
      )) as (input: string | Blob) => Promise<unknown>;
    })();
  }
  await loadIsnetPromise;
}

async function ensureBirefnet(
  onProgress?: (p: DekupeProgress) => void,
): Promise<void> {
  if (birefModel && birefProcessor) return;
  if (!loadBirefPromise) {
    loadBirefPromise = (async () => {
      onProgress?.({
        stage: "loading-birefnet",
        message: "BiRefNet (MIT) yükleniyor…",
        pct: 20,
      });
      const { AutoModel, AutoProcessor } = await import(
        "@huggingface/transformers"
      );
      const device = await envDevice();
      birefModel = (await AutoModel.from_pretrained(
        "studioludens/birefnet-lite-512",
        {
          dtype: device === "webgpu" ? "fp16" : "fp32",
          device,
        },
      )) as AnyModel;
      birefProcessor = (await AutoProcessor.from_pretrained(
        "studioludens/birefnet-lite-512",
      )) as Processor;
    })();
  }
  await loadBirefPromise;
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Blob okunamadı"));
    r.readAsDataURL(blob);
  });
}

async function runIsnetCutout(
  source: string | Blob,
  onProgress?: (p: DekupeProgress) => void,
): Promise<string> {
  await ensureIsnet(onProgress);
  onProgress?.({
    stage: "running-isnet",
    message: "ISNet ile hızlı kesim…",
    pct: 35,
  });
  const out = await isnetPipe!(source);
  // pipeline may return RawImage[] or single RawImage-like
  const first = Array.isArray(out) ? out[0] : out;
  if (first && typeof first === "object") {
    const any = first as {
      toBlob?: () => Promise<Blob>;
      canvas?: HTMLCanvasElement;
      toCanvas?: () => HTMLCanvasElement;
    };
    if (typeof any.toBlob === "function") {
      const blob = await any.toBlob();
      return blobToDataUrl(blob);
    }
    if (typeof any.toCanvas === "function") {
      return any.toCanvas().toDataURL("image/png");
    }
    if (any.canvas) {
      return any.canvas.toDataURL("image/png");
    }
  }
  throw new Error("ISNet çıktısı okunamadı");
}

async function runBirefnetCutout(
  sourceDataUrl: string,
  onProgress?: (p: DekupeProgress) => void,
): Promise<string> {
  await ensureBirefnet(onProgress);
  onProgress?.({
    stage: "running-birefnet",
    message: "BiRefNet final kesim…",
    pct: 55,
  });

  const { RawImage } = await import("@huggingface/transformers");
  const image = await RawImage.fromURL(sourceDataUrl);
  const processed = await birefProcessor!(image);
  const rawOut = await birefModel!({ input_image: processed.pixel_values });

  // logits → sigmoid → alpha
  const logits =
    (rawOut as { logits?: { data: Float32Array; dims: number[] } }).logits ??
    (rawOut as { output?: { data: Float32Array; dims: number[] } }).output ??
    (Object.values(rawOut)[0] as { data: Float32Array; dims: number[] });

  const data = logits.data;
  const dims = logits.dims;
  // expect [1,1,H,W] or [1,H,W]
  const h = dims.length === 4 ? dims[2]! : dims[1]!;
  const w = dims.length === 4 ? dims[3]! : dims[2]!;

  const alpha = new Float32Array(h * w);
  for (let i = 0; i < alpha.length; i++) {
    const x = data[i]!;
    alpha[i] = 1 / (1 + Math.exp(-x));
  }

  const srcRgb = await imageDataFromUrl(sourceDataUrl);
  // upsample mask to source size
  const maskFull = upsampleMask(alpha, w, h, srcRgb.width, srcRgb.height);
  const rgba = applyMaskToRgb(srcRgb, maskFull);
  return imageDataToDataUrl(rgba);
}

function upsampleMask(
  src: Float32Array,
  sw: number,
  sh: number,
  tw: number,
  th: number,
): Float32Array {
  const out = new Float32Array(tw * th);
  for (let y = 0; y < th; y++) {
    const sy = ((y + 0.5) * sh) / th - 0.5;
    const y0 = Math.max(0, Math.floor(sy));
    const y1 = Math.min(sh - 1, y0 + 1);
    const fy = sy - y0;
    for (let x = 0; x < tw; x++) {
      const sx = ((x + 0.5) * sw) / tw - 0.5;
      const x0 = Math.max(0, Math.floor(sx));
      const x1 = Math.min(sw - 1, x0 + 1);
      const fx = sx - x0;
      const v00 = src[y0 * sw + x0]!;
      const v01 = src[y0 * sw + x1]!;
      const v10 = src[y1 * sw + x0]!;
      const v11 = src[y1 * sw + x1]!;
      out[y * tw + x] =
        v00 * (1 - fx) * (1 - fy) +
        v01 * fx * (1 - fy) +
        v10 * (1 - fx) * fy +
        v11 * fx * fy;
    }
  }
  return out;
}

async function postprocessCutout(
  sourceDataUrl: string,
  birefDataUrl: string,
  isnetDataUrl: string | null,
  onProgress?: (p: DekupeProgress) => void,
): Promise<{ dataUrl: string; usedHybrid: boolean; notes: string[] }> {
  onProgress?.({
    stage: "postprocess",
    message: "Hole-fill + matting + hibrit (korumalı)…",
    pct: 80,
  });
  const notes: string[] = [];
  const srcRgb = await imageDataFromUrl(sourceDataUrl);
  // force RGB (strip alpha from source)
  for (let i = 3; i < srcRgb.data.length; i += 4) {
    srcRgb.data[i] = 255;
  }

  const birefRgba = await imageDataFromUrl(birefDataUrl);
  let { mask, stats } = extractAlphaMask(birefRgba);
  notes.push("BiRefNet (MIT) final");

  let usedHybrid = false;
  if (isnetDataUrl) {
    const isnetRgba = await imageDataFromUrl(isnetDataUrl);
    // resize isnet mask if needed
    let isnetMask: Float32Array;
    let isnetStats = extractAlphaMask(isnetRgba).stats;
    if (
      isnetRgba.width !== birefRgba.width ||
      isnetRgba.height !== birefRgba.height
    ) {
      const extracted = extractAlphaMask(isnetRgba);
      isnetMask = upsampleMask(
        extracted.mask,
        isnetRgba.width,
        isnetRgba.height,
        birefRgba.width,
        birefRgba.height,
      );
      let area = 0;
      for (let i = 0; i < isnetMask.length; i++) {
        if (isnetMask[i]! > 0.5) area++;
      }
      isnetStats = { area, mean: 0 };
    } else {
      isnetMask = extractAlphaMask(isnetRgba).mask;
    }
    const hybrid = guardedHybrid(
      mask,
      isnetMask,
      stats.area,
      isnetStats.area,
    );
    mask = hybrid.mask;
    usedHybrid = hybrid.usedHybrid;
    notes.push(
      usedHybrid
        ? "ISNet hibrit uygulandı (alan oranı güvenli)"
        : "ISNet hibrit atlandı (alan oranı dışı — aşırı kesim riski)",
    );
  }

  mask = morphHoleFill(mask, birefRgba.width, birefRgba.height, 2);
  notes.push("Hole-fill");
  mask = refineAlphaEdges(mask, birefRgba.width, birefRgba.height);
  notes.push("Matting-lite");

  let rgba = applyMaskToRgb(srcRgb, mask);
  rgba = suppressGreenSpill(rgba);
  notes.push("Yeşil spill bastırma");

  return {
    dataUrl: imageDataToDataUrl(rgba),
    usedHybrid,
    notes,
  };
}

/**
 * Full dekupe pipeline.
 * preview: ISNet only (fast).
 * final: BiRefNet + hole-fill + matting + guarded hybrid with ISNet if available.
 */
export async function runDekupe(
  sourceDataUrl: string,
  quality: DekupeQuality = "final",
  onProgress?: (p: DekupeProgress) => void,
): Promise<DekupeResult> {
  const notes: string[] = [];
  let previewDataUrl: string | null = null;
  let isnetDataUrl: string | null = null;

  try {
    isnetDataUrl = await runIsnetCutout(sourceDataUrl, onProgress);
    previewDataUrl = isnetDataUrl;
    notes.push("ISNet önizleme hazır");
  } catch (err) {
    notes.push(
      `ISNet atlandı: ${err instanceof Error ? err.message : "bilinmeyen hata"}`,
    );
  }

  if (quality === "preview") {
    if (!previewDataUrl) {
      // fallback to birefnet if isnet failed
      const biref = await runBirefnetCutout(sourceDataUrl, onProgress);
      onProgress?.({ stage: "done", message: "Önizleme hazır", pct: 100 });
      return {
        cutoutDataUrl: biref,
        previewDataUrl: biref,
        usedHybrid: false,
        quality: "preview",
        modelNotes: [...notes, "Önizleme BiRefNet ile"],
      };
    }
    onProgress?.({ stage: "done", message: "Önizleme hazır", pct: 100 });
    return {
      cutoutDataUrl: previewDataUrl,
      previewDataUrl,
      usedHybrid: false,
      quality: "preview",
      modelNotes: notes,
    };
  }

  const birefDataUrl = await runBirefnetCutout(sourceDataUrl, onProgress);
  const post = await postprocessCutout(
    sourceDataUrl,
    birefDataUrl,
    isnetDataUrl,
    onProgress,
  );

  onProgress?.({ stage: "done", message: "Dekupe tamam", pct: 100 });
  return {
    cutoutDataUrl: post.dataUrl,
    previewDataUrl,
    usedHybrid: post.usedHybrid,
    quality: "final",
    modelNotes: [...notes, ...post.notes],
  };
}

/** Heuristic color-key fallback when ML models fail (offline / blocked CDN). */
export async function chromaKeyFallback(
  sourceDataUrl: string,
): Promise<string> {
  const rgba = await imageDataFromUrl(sourceDataUrl);
  const { data, width, height } = rgba;
  // sample corners for bg estimate
  const samples = [
    0,
    (width - 1) * 4,
    (height - 1) * width * 4,
    ((height - 1) * width + (width - 1)) * 4,
  ];
  let br = 0;
  let bg = 0;
  let bb = 0;
  for (const s of samples) {
    br += data[s]!;
    bg += data[s + 1]!;
    bb += data[s + 2]!;
  }
  br /= 4;
  bg /= 4;
  bb /= 4;
  const thresh = 42;
  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i]! - br;
    const dg = data[i + 1]! - bg;
    const db = data[i + 2]! - bb;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    data[i + 3] = dist < thresh ? 0 : 255;
  }
  return imageDataToDataUrl(rgba);
}
