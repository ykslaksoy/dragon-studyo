"use client";

import { useEffect, useRef, useState } from "react";
import type { DekupeRoi } from "../lib/dekupe";

type Mode = "select" | "erase" | "restore";

const MAX_W = 560;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Görsel yüklenemedi"));
    img.src = src;
  });
}

/**
 * Product selection + refine brush.
 * - "Ürünü seç": drag a box around the product → BiRefNet runs only inside it.
 * - "Sil" / "Geri getir": paint on the cutout; restore copies source pixels.
 * Works at full source resolution; display is scaled.
 */
export function CutoutEditor({
  sourceUrl,
  cutoutUrl,
  busy,
  onCutWithRoi,
  onSave,
}: {
  sourceUrl: string;
  cutoutUrl: string | null;
  busy: boolean;
  onCutWithRoi: (roi: DekupeRoi | null) => void;
  onSave: (dataUrl: string) => void;
}) {
  const [mode, setMode] = useState<Mode>(cutoutUrl ? "erase" : "select");
  const [brush, setBrush] = useState(28);
  const [roi, setRoi] = useState<DekupeRoi | null>(null);
  const [dirty, setDirty] = useState(false);
  const [undoCount, setUndoCount] = useState(0);
  const [, setTick] = useState(0);
  const viewRef = useRef<HTMLCanvasElement>(null);
  const srcRef = useRef<HTMLImageElement | null>(null);
  const workRef = useRef<HTMLCanvasElement | null>(null);
  const undoRef = useRef<ImageData[]>([]);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const paintingRef = useRef(false);
  const [size, setSize] = useState({ w: 1, h: 1, scale: 1 });

  // load source + cutout into a full-res working canvas
  useEffect(() => {
    let alive = true;
    void (async () => {
      const src = await loadImage(sourceUrl);
      if (!alive) return;
      srcRef.current = src;
      const work = document.createElement("canvas");
      work.width = src.naturalWidth;
      work.height = src.naturalHeight;
      if (cutoutUrl) {
        const cut = await loadImage(cutoutUrl);
        if (!alive) return;
        work.getContext("2d")!.drawImage(cut, 0, 0, work.width, work.height);
      }
      workRef.current = work;
      undoRef.current = [];
      const scale = Math.min(1, MAX_W / src.naturalWidth);
      setSize({ w: Math.round(src.naturalWidth * scale), h: Math.round(src.naturalHeight * scale), scale });
      setDirty(false);
    })();
    return () => {
      alive = false;
    };
  }, [sourceUrl, cutoutUrl]);

  // redraw view
  useEffect(() => {
    const v = viewRef.current;
    const src = srcRef.current;
    const work = workRef.current;
    if (!v || !src || !work) return;
    const ctx = v.getContext("2d")!;
    ctx.clearRect(0, 0, v.width, v.height);
    if (mode === "select" || !cutoutUrl) {
      ctx.drawImage(src, 0, 0, v.width, v.height);
      if (roi) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        const rx = roi.x * v.width, ry = roi.y * v.height, rw = roi.w * v.width, rh = roi.h * v.height;
        ctx.fillRect(0, 0, v.width, ry);
        ctx.fillRect(0, ry + rh, v.width, v.height - ry - rh);
        ctx.fillRect(0, ry, rx, rh);
        ctx.fillRect(rx + rw, ry, v.width - rx - rw, rh);
        ctx.strokeStyle = "#8CFF4D";
        ctx.lineWidth = 2;
        ctx.strokeRect(rx, ry, rw, rh);
      }
    } else {
      // faint source underneath so erased/restorable areas are visible
      ctx.globalAlpha = 0.18;
      ctx.drawImage(src, 0, 0, v.width, v.height);
      ctx.globalAlpha = 1;
      ctx.drawImage(work, 0, 0, v.width, v.height);
    }
  });

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  };

  const paintAt = (nx: number, ny: number) => {
    const work = workRef.current;
    const src = srcRef.current;
    if (!work || !src) return;
    const ctx = work.getContext("2d")!;
    const x = nx * work.width;
    const y = ny * work.height;
    const r = brush / size.scale / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (mode === "erase") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.fill();
    } else {
      ctx.clip();
      ctx.clearRect(x - r, y - r, r * 2, r * 2);
      ctx.drawImage(src, 0, 0, work.width, work.height);
    }
    ctx.restore();
    setDirty(true);
    setTick((t) => t + 1);
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pos(e);
    if (mode === "select" || !cutoutUrl) {
      dragRef.current = p;
      setRoi({ x: p.x, y: p.y, w: 0, h: 0 });
      return;
    }
    const work = workRef.current;
    if (work) {
      undoRef.current.push(work.getContext("2d")!.getImageData(0, 0, work.width, work.height));
      if (undoRef.current.length > 12) undoRef.current.shift();
      setUndoCount(undoRef.current.length);
    }
    paintingRef.current = true;
    paintAt(p.x, p.y);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = pos(e);
    if (dragRef.current) {
      const a = dragRef.current;
      setRoi({ x: Math.min(a.x, p.x), y: Math.min(a.y, p.y), w: Math.abs(p.x - a.x), h: Math.abs(p.y - a.y) });
    } else if (paintingRef.current) {
      paintAt(p.x, p.y);
    }
  };
  const onUp = () => {
    dragRef.current = null;
    paintingRef.current = false;
  };

  const undo = () => {
    const work = workRef.current;
    const last = undoRef.current.pop();
    if (work && last) {
      work.getContext("2d")!.putImageData(last, 0, 0);
      setDirty(true);
    }
    setUndoCount(undoRef.current.length);
  };

  const tab = (m: Mode, label: string, disabled = false) => (
    <button
      type="button"
      disabled={disabled}
      data-mode={m}
      onClick={() => setMode(m)}
      className={`rounded-sm border px-3 py-1.5 text-[12px] disabled:opacity-30 ${
        mode === m ? "border-[#8CFF4D]/70 bg-[#8CFF4D]/20 text-white" : "border-white/20 text-white/70"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="mt-3 space-y-3 rounded-sm border border-white/10 bg-black/40 p-3" data-testid="cutout-editor">
      <div className="flex flex-wrap items-center gap-2">
        {tab("select", "Ürünü seç (kutu)")}
        {tab("erase", "Fırça: Sil", !cutoutUrl)}
        {tab("restore", "Fırça: Geri getir", !cutoutUrl)}
        {mode !== "select" && cutoutUrl && (
          <label className="flex items-center gap-2 text-[11px] text-white/60">
            Boyut
            <input type="range" min={6} max={90} value={brush} onChange={(e) => setBrush(Number(e.target.value))} />
          </label>
        )}
      </div>
      <p className="text-[11px] text-white/50">
        {mode === "select"
          ? "Ürünün etrafına kutu çiz; BiRefNet yalnızca bu alanı keser (yanındaki kişi, buket, dekor dışarıda kalır)."
          : "Fazla kalan yerleri Sil ile kaldır, eksik kalan kenarları Geri getir ile kaynaktan geri boya."}
      </p>
      <canvas
        ref={viewRef}
        width={size.w}
        height={size.h}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        className="max-w-full touch-none rounded-sm border border-white/15"
        style={{
          cursor: mode === "select" ? "crosshair" : "cell",
          background: "repeating-conic-gradient(#444 0% 25%, #2a2a2a 0% 50%) 50% / 14px 14px",
        }}
      />
      <div className="flex flex-wrap gap-2">
        {mode === "select" ? (
          <>
            <button
              type="button"
              disabled={busy || !roi || roi.w < 0.03 || roi.h < 0.03}
              onClick={() => onCutWithRoi(roi)}
              className="rounded-sm bg-[#8CFF4D] px-3 py-1.5 text-[12px] font-semibold text-black disabled:opacity-40"
            >
              {busy ? "Kesiliyor…" : "Seçimle kes (BiRefNet)"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setRoi(null);
                onCutWithRoi(null);
              }}
              className="rounded-sm border border-white/20 px-3 py-1.5 text-[12px] text-white/75 disabled:opacity-40"
            >
              Tüm görseli kes
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={!undoCount}
              onClick={undo}
              className="rounded-sm border border-white/20 px-3 py-1.5 text-[12px] text-white/75 disabled:opacity-40"
            >
              Geri al
            </button>
            <button
              type="button"
              disabled={!dirty}
              onClick={() => {
                const work = workRef.current;
                if (!work) return;
                onSave(work.toDataURL("image/png"));
                setDirty(false);
              }}
              className="rounded-sm bg-[#8CFF4D] px-3 py-1.5 text-[12px] font-semibold text-black disabled:opacity-40"
            >
              Rötuşu kaydet
            </button>
          </>
        )}
      </div>
    </div>
  );
}
