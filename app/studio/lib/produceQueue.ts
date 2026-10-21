import {
  FRAME_QUEUE_LIMIT,
  frameSpec,
  type FrameSpec,
  type Purpose,
} from "./catalog";
import { renderSceneFrame } from "./sceneComposer";

export type FrameJob = {
  spec: FrameSpec;
  status: "pending" | "running" | "ready" | "error";
  thumbUrl: string | null;
  error?: string;
};

export function buildJobs(labels: string[]): FrameJob[] {
  return labels.slice(0, FRAME_QUEUE_LIMIT).map((label) => ({
    spec: frameSpec(label),
    status: "pending",
    thumbUrl: null,
  }));
}

/**
 * Sequential 24-frame queue: each frame individually prepared via canvas composer.
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
      // yield so UI can paint
      await new Promise((r) => setTimeout(r, 16));
      const thumbUrl = await renderSceneFrame(
        cutoutDataUrl,
        purpose,
        jobs[i]!.spec,
      );
      jobs[i] = { ...jobs[i]!, status: "ready", thumbUrl };
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
