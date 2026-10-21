/** Session persistence for upload + cutout feeding the scenario engine. */

const UPLOAD_KEY = "dragon-studio-upload-v1";
const CUTOUT_KEY = "dragon-studio-cutout-v1";

export type UploadSession = {
  name: string;
  type: string;
  dataUrl: string;
  savedAt: number;
};

export type CutoutSession = {
  cutoutDataUrl: string;
  previewDataUrl: string | null;
  usedHybrid: boolean;
  modelNotes: string[];
  quality: "preview" | "final";
  sourceHash: string;
  savedAt: number;
};

export function persistUpload(name: string, type: string, dataUrl: string) {
  try {
    const payload: UploadSession = {
      name,
      type,
      dataUrl,
      savedAt: Date.now(),
    };
    sessionStorage.setItem(UPLOAD_KEY, JSON.stringify(payload));
  } catch {
    /* quota */
  }
}

export function loadUpload(): UploadSession | null {
  try {
    const raw = sessionStorage.getItem(UPLOAD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UploadSession;
    if (!parsed?.dataUrl || !parsed.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearUpload() {
  try {
    sessionStorage.removeItem(UPLOAD_KEY);
  } catch {
    /* ignore */
  }
}

export function persistCutout(cutout: Omit<CutoutSession, "savedAt">) {
  try {
    const payload: CutoutSession = { ...cutout, savedAt: Date.now() };
    sessionStorage.setItem(CUTOUT_KEY, JSON.stringify(payload));
  } catch {
    /* large PNG may exceed quota — engine still holds in memory */
  }
}

export function loadCutout(): CutoutSession | null {
  try {
    const raw = sessionStorage.getItem(CUTOUT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CutoutSession;
  } catch {
    return null;
  }
}

export function clearCutout() {
  try {
    sessionStorage.removeItem(CUTOUT_KEY);
  } catch {
    /* ignore */
  }
}

export function clearAllStudioSession() {
  clearUpload();
  clearCutout();
}

/** Cheap fingerprint so we know cutout matches current upload. */
export function sourceHash(dataUrl: string): string {
  let h = 0;
  const sample = dataUrl.slice(0, 512) + dataUrl.slice(-256) + String(dataUrl.length);
  for (let i = 0; i < sample.length; i++) {
    h = (h * 31 + sample.charCodeAt(i)) | 0;
  }
  return String(h);
}
