import {
  FRAME_QUEUE_LIMIT,
  frameSpec,
  type FrameSpec,
  type Purpose,
} from "./catalog";
import { renderSceneFrame } from "./sceneComposer";
import { renderInHandScene, renderLifestyleScene } from "./lifestyleFallback";
import { renderWearFrame } from "./wear/engine";
import { wearJobForFrame } from "./wear/placements";

export type FrameJob = {
  spec: FrameSpec;
  status: "pending" | "running" | "ready" | "error";
  thumbUrl: string | null;
  error?: string;
  method?:
    | "canvas"
    | "mannequin_warp_v3"
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
): Promise<FrameJob[]> {
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
            if (/elde|in.hand|ürün reveal/.test(b)) {
              thumbUrl = await renderInHandScene(cutoutDataUrl);
              method = "inhand_composite";
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
        const wear =
          purpose === "artistic" || /mannequin|giyili|worn/i.test(spec.baseFrame)
            ? wearJobForFrame(spec.baseFrame)
            : null;
        if (wear && /mannequin|giyili|worn|editorial portrait/i.test(spec.baseFrame)) {
          thumbUrl = await renderWearFrame(cutoutDataUrl, wear);
          method = "mannequin_warp_v3";
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
