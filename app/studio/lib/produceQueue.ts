import {
  FRAME_QUEUE_LIMIT,
  frameSpec,
  type FrameSpec,
  type Purpose,
} from "./catalog";
import { renderSceneFrame } from "./sceneComposer";
import { renderLifestyleScene } from "./lifestyleFallback";
import { renderWornFrame, type ProductKind } from "./wear/forms";

export type FrameJob = {
  spec: FrameSpec;
  status: "pending" | "running" | "ready" | "error";
  thumbUrl: string | null;
  error?: string;
  method?:
    | "canvas"
    | "mannequin_warp_v3"
    | "worn_form"
    | "fal_gen"
    | "canvas_gen_placeholder"
    | "inhand_composite"
    | "lifestyle_composite";
};

export function buildJobs(labels: string[]): FrameJob[] {
  return labels.slice(0, FRAME_QUEUE_LIMIT).map((label) => ({
    spec: frameSpec(label),
    status: "pending",
    thumbUrl: null,
  }));
}

async function tryFalGen(
  cutoutDataUrl: string,
  purpose: Purpose,
  spec: FrameSpec,
): Promise<string | null> {
  try {
    const res = await fetch("/api/gen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        frameLabel: spec.label,
        purpose,
        // data URL kept for future upload bridge; route accepts https only for img2img
        cutoutDataUrl,
      }),
    });
    if (res.status === 503) return null; // FAL_KEY missing — expected
    if (!res.ok) return null;
    const data = (await res.json()) as { ok?: boolean; imageUrl?: string };
    return data.ok && data.imageUrl ? data.imageUrl : null;
  } catch {
    return null;
  }
}

/**
 * Sequential 24-frame queue: canvas composer, mannequin occlusion-warp v3,
 * or fal GEN when FAL_KEY is configured.
 */
export async function runProduceQueue(
  cutoutDataUrl: string,
  purpose: Purpose,
  labels: string[],
  onUpdate: (jobs: FrameJob[], readyCount: number) => void,
  signal?: { cancelled: boolean },
  kind: ProductKind = "other",
): Promise<FrameJob[]> {
  const WORN = /elde|in.hand|ürün reveal|mannequin|giyili|worn|editorial portrait/i;
  const jobs = buildJobs(labels);
  onUpdate(jobs.map((j) => ({ ...j })), 0);

  let ready = 0;
  for (let i = 0; i < jobs.length; i++) {
    if (signal?.cancelled) break;
    jobs[i] = { ...jobs[i]!, status: "running", thumbUrl: null };
    onUpdate(jobs.map((j) => ({ ...j })), ready);

    try {
      await new Promise((r) => setTimeout(r, 16));
      const spec = jobs[i]!.spec;
      let thumbUrl: string;
      let method: FrameJob["method"] = "canvas";

      if (spec.realism === "needs_gen_ai") {
        const falUrl = await tryFalGen(cutoutDataUrl, purpose, spec);
        if (falUrl) {
          thumbUrl = falUrl;
          method = "fal_gen";
        } else {
          // Keyless fallback: the real product must always be visible.
          const b = spec.baseFrame.toLowerCase();
          try {
            if (WORN.test(b)) {
              thumbUrl = await renderWornFrame(cutoutDataUrl, kind);
              method = kind === "bottle" ? "inhand_composite" : "worn_form";
            } else if (/lifestyle|ugc|stok hissi|talking-head/.test(b)) {
              thumbUrl = await renderLifestyleScene(cutoutDataUrl);
              method = "lifestyle_composite";
            } else {
              thumbUrl = await renderSceneFrame(cutoutDataUrl, purpose, spec);
              method = "canvas_gen_placeholder";
            }
          } catch {
            thumbUrl = await renderSceneFrame(cutoutDataUrl, purpose, spec);
            method = "canvas_gen_placeholder";
          }
        }
      } else {
        if (WORN.test(spec.baseFrame)) {
          thumbUrl = await renderWornFrame(cutoutDataUrl, kind);
          method = kind === "bottle" ? "inhand_composite" : "worn_form";
        } else {
          thumbUrl = await renderSceneFrame(cutoutDataUrl, purpose, spec);
          method = "canvas";
        }
      }

      jobs[i] = { ...jobs[i]!, status: "ready", thumbUrl, method };
      ready += 1;
    } catch (err) {
      jobs[i] = {
        ...jobs[i]!,
        status: "error",
        thumbUrl: null,
        error: err instanceof Error ? err.message : "Üretim hatası",
      };
    }
    onUpdate(jobs.map((j) => ({ ...j })), ready);
  }
  return jobs;
}
