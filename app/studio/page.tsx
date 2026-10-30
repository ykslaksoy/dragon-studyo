"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ANGLES,
  CHANNELS,
  FRAME_QUEUE_LIMIT,
  PACKAGES,
  PURPOSES,
  buildOutputList,
  type Purpose,
} from "./lib/catalog";
import {
  PAID_FALLBACK_DESIGN,
  chromaKeyFallback,
  runDekupe,
  runPaidDekupeFallback,
  type DekupeProgress,
  type DekupeRoi,
} from "./lib/dekupe";
import { runProduceQueue, type FrameJob } from "./lib/produceQueue";
import { CutoutEditor } from "./components/CutoutEditor";
import { PRODUCT_KINDS, guessKind, type ProductKind } from "./lib/wear/photoreal";
import {
  clearAllStudioSession,
  loadCutout,
  loadUpload,
  persistCutout,
  persistUpload,
  sourceHash,
} from "./lib/session";

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-sm border px-3 py-2 text-left text-[13px] backdrop-blur-md transition ${
        active
          ? "border-[#8CFF4D]/70 text-white"
          : "border-white/20 text-white/80 hover:border-white/35"
      }`}
      style={{
        backgroundColor: active ? "rgba(140,255,77,0.20)" : "rgba(0,0,0,0.85)",
      }}
    >
      {children}
    </button>
  );
}

export default function StudioPage() {
  const [step, setStep] = useState(1);
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [channel, setChannel] = useState<string | null>(null);
  const [packId, setPackId] = useState<string | null>(null);
  const [angles, setAngles] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [cutoutUrl, setCutoutUrl] = useState<string | null>(null);
  const [previewCutoutUrl, setPreviewCutoutUrl] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [finalBusy, setFinalBusy] = useState(false);
  const [dekupeMsg, setDekupeMsg] = useState<string | null>(null);
  const [dekupeNotes, setDekupeNotes] = useState<string[]>([]);
  const [showRefineStub, setShowRefineStub] = useState(false);
  const [showPaidStub, setShowPaidStub] = useState(false);
  const [productKind, setProductKind] = useState<ProductKind | "auto">("auto");
  const [paidBusy, setPaidBusy] = useState(false);
  const [paidNote, setPaidNote] = useState<string | null>(null);
  const [genConfigured, setGenConfigured] = useState<boolean | null>(null);
  const [produceNote, setProduceNote] = useState<string | null>(null);
  const [phase, setPhase] = useState<"wizard" | "producing" | "done">("wizard");
  const [jobs, setJobs] = useState<FrameJob[]>([]);
  const [readyCount, setReadyCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef({ cancelled: false });

  const packs = purpose ? PACKAGES[purpose] : [];

  const canNext =
    (step === 1 && !!purpose) ||
    (step === 2 && !!channel) ||
    (step === 3 && !!packId) ||
    step === 4;

  const summary = useMemo(() => {
    const selectedPack = purpose
      ? (PACKAGES[purpose].find((p) => p.id === packId) ?? null)
      : null;
    if (!purpose || !channel || !selectedPack) return null;
    const angleLabels = angles.map(
      (id) => ANGLES.find((a) => a.id === id)?.label ?? id,
    );
    const fullList = buildOutputList(selectedPack.frames, angleLabels);
    const queued = fullList.slice(0, FRAME_QUEUE_LIMIT);
    return {
      purposeLabel: PURPOSES.find((p) => p.id === purpose)?.title ?? "",
      channelLabel:
        CHANNELS[purpose].find((p) => p.id === channel)?.label ?? "",
      pack: selectedPack,
      angleLabels,
      outputList: queued,
      fullTotal: fullList.length,
      total: queued.length,
      truncated: fullList.length > FRAME_QUEUE_LIMIT,
    };
  }, [purpose, channel, packId, angles]);

  const toggleAngle = (id: string) => {
    setAngles((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
    setConfirmed(false);
    setProduceNote(null);
  };

  const resetUpload = () => {
    setUploadFile(null);
    setUploadPreview(null);
    setCutoutUrl(null);
    setPreviewCutoutUrl(null);
    setDekupeNotes([]);
    setDekupeMsg(null);
    setProduceNote(null);
    setPhase("wizard");
    setJobs([]);
    setReadyCount(0);
    clearAllStudioSession();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startFresh = () => {
    cancelRef.current.cancelled = true;
    setStep(1);
    setPurpose(null);
    setChannel(null);
    setPackId(null);
    setAngles([]);
    setConfirmed(false);
    setShowRefineStub(false);
    setShowPaidStub(false);
    resetUpload();
  };

  useEffect(() => {
    void fetch("/api/gen")
      .then((r) => r.json())
      .then((d: { configured?: boolean }) => setGenConfigured(Boolean(d.configured)))
      .catch(() => setGenConfigured(false));
  }, []);

  useEffect(() => {
    const saved = loadUpload();
    if (!saved) return;
    // Defer restore so state updates happen outside the effect body.
    queueMicrotask(() => setUploadPreview(saved.dataUrl));
    void fetch(saved.dataUrl)
      .then((r) => r.blob())
      .then((blob) => {
        const file = new File([blob], saved.name, {
          type: saved.type || blob.type || "image/png",
        });
        setUploadFile(file);
      });
    queueMicrotask(() => {
      const cut = loadCutout();
      if (cut && cut.sourceHash === sourceHash(saved.dataUrl)) {
        setCutoutUrl(cut.cutoutDataUrl);
        setPreviewCutoutUrl(cut.previewDataUrl);
        setDekupeNotes(cut.modelNotes);
      }
    });
  }, []);

  const onPickFile = (file: File | null) => {
    if (!file) {
      resetUpload();
      return;
    }
    if (!file.type.startsWith("image/")) {
      setProduceNote("Lütfen bir görsel dosyası seç (JPG, PNG, WebP).");
      return;
    }
    setUploadFile(file);
    setCutoutUrl(null);
    setPreviewCutoutUrl(null);
    setDekupeNotes([]);
    setProduceNote(null);
    setShowRefineStub(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      if (!dataUrl) return;
      setUploadPreview(dataUrl);
      persistUpload(file.name, file.type, dataUrl);
      // Fast ISNet preview in background
      void runPreviewDekupe(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const runPreviewDekupe = async (dataUrl: string) => {
    setPreviewBusy(true);
    setDekupeMsg("Hızlı önizleme (ISNet)…");
    try {
      const res = await Promise.race([
        runDekupe(dataUrl, "preview", (p: DekupeProgress) => {
          setDekupeMsg(p.message);
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("ISNet önizleme zaman aşımı")),
            60_000,
          ),
        ),
      ]);
      setPreviewCutoutUrl(res.cutoutDataUrl);
      setDekupeNotes(res.modelNotes);
      setDekupeMsg("Önizleme kesim hazır — final BiRefNet üretimde çalışır.");
    } catch {
      setDekupeMsg("Önizleme modeli yüklenemedi; finalde BiRefNet denenecek.");
    } finally {
      setPreviewBusy(false);
    }
  };

  const ensureFinalCutout = async (
    dataUrl: string,
    roi: DekupeRoi | null = null,
  ): Promise<string> => {
    setFinalBusy(true);
    setDekupeMsg("Final dekupe: BiRefNet + kalite düzeltmeleri…");
    const withTimeout = <T,>(p: Promise<T>, ms: number, label: string) =>
      Promise.race([
        p,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error(`${label} zaman aşımı (${ms}ms)`)), ms),
        ),
      ]);
    try {
      const res = await withTimeout(
        runDekupe(
          dataUrl,
          "final",
          (p: DekupeProgress) => {
            setDekupeMsg(p.message);
          },
          { roi },
        ),
        120_000,
        "BiRefNet",
      );
      setCutoutUrl(res.cutoutDataUrl);
      if (res.previewDataUrl) setPreviewCutoutUrl(res.previewDataUrl);
      setDekupeNotes(res.modelNotes);
      persistCutout({
        cutoutDataUrl: res.cutoutDataUrl,
        previewDataUrl: res.previewDataUrl,
        usedHybrid: res.usedHybrid,
        modelNotes: res.modelNotes,
        quality: "final",
        sourceHash: sourceHash(dataUrl),
      });
      setDekupeMsg("Dekupe tamam — senaryo motoruna aktarıldı.");
      return res.cutoutDataUrl;
    } catch (err) {
      // Prefer existing ISNet preview over chroma if available
      if (previewCutoutUrl) {
        setDekupeMsg(
          `Final model yavaş/başarısız (${err instanceof Error ? err.message : "hata"}); ISNet önizleme ile devam.`,
        );
        setCutoutUrl(previewCutoutUrl);
        persistCutout({
          cutoutDataUrl: previewCutoutUrl,
          previewDataUrl: previewCutoutUrl,
          usedHybrid: false,
          modelNotes: ["ISNet önizleme (final zaman aşımı/hata)"],
          quality: "preview",
          sourceHash: sourceHash(dataUrl),
        });
        return previewCutoutUrl;
      }
      setDekupeMsg(
        `ML dekupe başarısız (${err instanceof Error ? err.message : "hata"}); basit anahtarlama yedekleniyor.`,
      );
      const fallback = await chromaKeyFallback(dataUrl);
      setCutoutUrl(fallback);
      persistCutout({
        cutoutDataUrl: fallback,
        previewDataUrl: null,
        usedHybrid: false,
        modelNotes: ["chroma-key yedek"],
        quality: "final",
        sourceHash: sourceHash(dataUrl),
      });
      return fallback;
    } finally {
      setFinalBusy(false);
    }
  };

  const handlePrimary = async () => {
    if (!summary) return;
    if (phase === "done") {
      startFresh();
      return;
    }
    if (phase === "producing" || finalBusy) return;
    if (!confirmed) {
      setConfirmed(true);
      setProduceNote(null);
      requestAnimationFrame(() => {
        document.getElementById("studio-upload")?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
      return;
    }
    if (!uploadFile || !uploadPreview) {
      fileInputRef.current?.click();
      return;
    }

    cancelRef.current = { cancelled: false };
    setPhase("producing");
    setProduceNote(null);
    setJobs([]);
    setReadyCount(0);

    const cutout = cutoutUrl ?? (await ensureFinalCutout(uploadPreview));
    if (cancelRef.current.cancelled) return;
    let kind: ProductKind = productKind === "auto" ? "other" : productKind;
    if (productKind === "auto") {
      const img = document.createElement("img");
      img.src = cutout;
      await img.decode().catch(() => undefined);
      kind = guessKind(uploadFile.name, img.width / Math.max(1, img.height));
    }

    await runProduceQueue(
      cutout,
      purpose!,
      summary.outputList,
      (nextJobs, ready) => {
        setJobs(nextJobs);
        setReadyCount(ready);
      },
      cancelRef.current,
      kind,
    );
    if (!cancelRef.current.cancelled) setPhase("done");
  };

  const activeCutout = cutoutUrl ?? previewCutoutUrl;

  const runPaidFallback = async () => {
    if (!uploadPreview) {
      setPaidNote("Önce görsel yükle.");
      return;
    }
    setPaidBusy(true);
    setPaidNote("Photoroom isteği…");
    try {
      const blob = await (await fetch(uploadPreview)).blob();
      const res = await runPaidDekupeFallback(blob);
      if ("blockedEnv" in res) {
        setPaidNote(
          `Bloklandı: ${res.blockedEnv} — ${res.message}. Çekirdek BiRefNet yolu açık.`,
        );
        return;
      }
      setCutoutUrl(res.cutoutDataUrl);
      persistCutout({
        cutoutDataUrl: res.cutoutDataUrl,
        previewDataUrl: previewCutoutUrl,
        usedHybrid: false,
        modelNotes: ["Photoroom ücretli fallback"],
        quality: "final",
        sourceHash: sourceHash(uploadPreview),
      });
      setPaidNote("Photoroom cutout hazır.");
    } catch (err) {
      setPaidNote(err instanceof Error ? err.message : "Photoroom hatası");
    } finally {
      setPaidBusy(false);
    }
  };

  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-[100vw] overflow-x-clip text-white">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{ backgroundColor: "#070708" }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 55% at 50% 38%, rgba(140,255,77,0.12), transparent 58%)",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center pb-[min(6vh,3rem)] opacity-80">
          <div className="atmosphere-drift w-[min(640px,88%)] max-w-full sm:w-[min(860px,70%)]">
            <Image
              src="/dragon-mark.png"
              alt=""
              width={1200}
              height={1100}
              priority
              className="ghost-mask mx-auto h-auto w-full select-none"
              draggable={false}
            />
          </div>
        </div>
      </div>

      <div className="relative z-10 px-[max(1.25rem,env(safe-area-inset-left))] pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] pt-[max(1.25rem,env(safe-area-inset-top))] pr-[max(1.25rem,env(safe-area-inset-right))]">
        <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4">
          <Link
            href="/"
            className="rounded-sm bg-black/30 px-2 py-1 text-[12px] tracking-[0.2em] text-white/70 backdrop-blur-md hover:text-white"
          >
            ← Dragon Stüdyo
          </Link>
          <span className="mono rounded-sm bg-black/30 px-2 py-1 text-[10px] tracking-[0.24em] text-[#8CFF4D]/90 backdrop-blur-md">
            {phase === "wizard"
              ? `SENARYO / ${step}/4`
              : phase === "producing"
                ? "ÜRETİM"
                : "TAMAM"}
          </span>
        </header>

        <main className="mx-auto mt-10 w-full max-w-3xl">
          {phase !== "wizard" && summary && (
            <div className="space-y-6">
              <div>
                <h1 className="text-[clamp(28px,6vw,44px)] font-semibold tracking-[-0.03em]">
                  {phase === "producing" ? "Üretim sürüyor" : "Üretim tamamlandı"}
                </h1>
                <p className="mt-3 text-[15px] text-white/65">
                  {readyCount} / {summary.total} kare hazır
                  {summary.truncated
                    ? ` (kuyruk limiti ${FRAME_QUEUE_LIMIT}; toplam ${summary.fullTotal})`
                    : ""}
                  {phase === "producing" && finalBusy
                    ? ` — ${dekupeMsg ?? "dekupe…"}`
                    : phase === "done"
                      ? " — her kare ayrı hazırlandı (crop / zoom / açı / zemin / gölge)."
                      : "."}
                </p>
              </div>

              {activeCutout && (
                <div
                  className="flex items-center gap-3 rounded-md border border-white/15 p-3 backdrop-blur-md"
                  style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeCutout}
                    alt="Dekupe"
                    className="h-14 w-14 rounded-sm object-contain"
                    style={{
                      background:
                        "repeating-conic-gradient(#333 0% 25%, #222 0% 50%) 50% / 12px 12px",
                    }}
                  />
                  <div className="min-w-0 text-[13px]">
                    <p className="truncate text-white/90">{uploadFile?.name}</p>
                    <p className="text-white/50">
                      {summary.purposeLabel} · {summary.channelLabel} ·{" "}
                      {summary.pack.title}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {(jobs.length
                  ? jobs
                  : summary.outputList.map((label) => ({
                      spec: {
                        label,
                        displayLabel: label,
                        baseFrame: label,
                        angleLabel: null as string | null,
                        realism: "canvas_ok" as const,
                      },
                      status: "pending" as const,
                      thumbUrl: null as string | null,
                    }))
                ).map((job, idx) => {
                  const st = job.status;
                  return (
                    <div
                      key={`${job.spec.label}-${idx}`}
                      className="relative overflow-hidden rounded-md border border-white/15 aspect-square"
                      style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
                    >
                      {st === "ready" && job.thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={job.thumbUrl}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[11px] text-white/35">
                            {st === "running"
                              ? "Üretiliyor…"
                              : st === "error"
                                ? "Hata"
                                : "Sırada"}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 pt-6">
                        <p className="text-[11px] leading-snug text-white/90">
                          {job.spec.displayLabel}
                        </p>
                        <p
                          className={`mt-0.5 text-[10px] ${
                            st === "ready"
                              ? "text-[#8CFF4D]"
                              : st === "running"
                                ? "text-white/70"
                                : st === "error"
                                  ? "text-red-300"
                                  : "text-white/40"
                          }`}
                        >
                          {st === "ready"
                            ? job.method === "fal_gen"
                              ? "Hazır · fal GEN"
                              : job.method === "inhand_composite"
                                ? "Hazır · elde kompozit"
                                : job.method === "lifestyle_composite"
                                  ? "Hazır · lifestyle kompozit"
                                  : job.method === "worn_photo"
                                ? "Hazır · giyili foto kompozit"
                                : job.method === "canvas_gen_placeholder"
                                  ? "Hazır · [GEN] yer tutucu"
                                  : "Hazır · tuval"
                            : st === "running"
                              ? "İşleniyor"
                              : st === "error"
                                ? "Hata"
                                : "Bekliyor"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {phase === "wizard" && (
            <>
              <h1 className="text-[clamp(28px,6vw,44px)] font-semibold tracking-[-0.03em] drop-shadow-[0_2px_12px_rgba(0,0,0,0.65)]">
                Ne için üretelim?
              </h1>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/65 drop-shadow-[0_1px_8px_rgba(0,0,0,0.7)]">
                Amaç → platform/format → paket → isteğe bağlı açılar. Her kare
                ayrı hazırlanır; dekupe tarayıcıda (ISNet önizleme, BiRefNet
                final).
              </p>

              <ol className="mt-8 flex flex-wrap gap-2">
                {["Amaç", "Platform", "Paket", "Açılar"].map((label, i) => {
                  const n = i + 1;
                  return (
                    <li
                      key={label}
                      className={`rounded-full px-3 py-1 text-[11px] tracking-[0.12em] backdrop-blur-md ${
                        step === n
                          ? "bg-[#8CFF4D] text-black"
                          : step > n
                            ? "bg-white/15 text-white/85"
                            : "bg-black/35 text-white/40"
                      }`}
                    >
                      {n}. {label}
                    </li>
                  );
                })}
              </ol>

              <section className="mt-8 rounded-md border border-white/15 bg-transparent p-5 sm:p-6">
                {step === 1 && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {PURPOSES.map((p) => (
                      <Chip
                        key={p.id}
                        active={purpose === p.id}
                        onClick={() => {
                          setPurpose(p.id);
                          setChannel(null);
                          setPackId(null);
                          setConfirmed(false);
                          setPhase("wizard");
                          setJobs([]);
                          setReadyCount(0);
                          setProduceNote(null);
                        }}
                      >
                        <div className="font-medium text-white">{p.title}</div>
                        <div className="mt-1 text-[12px] text-white/45">
                          {p.desc}
                        </div>
                      </Chip>
                    ))}
                  </div>
                )}

                {step === 2 && purpose && (
                  <div>
                    <p className="mb-3 text-[12px] tracking-[0.14em] text-white/40">
                      {purpose === "marketplace" ||
                      purpose === "live" ||
                      purpose === "multi-angle"
                        ? "PLATFORM"
                        : "FORMAT"}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {CHANNELS[purpose].map((p) => (
                        <Chip
                          key={p.id}
                          active={channel === p.id}
                          onClick={() => {
                            setChannel(p.id);
                            setConfirmed(false);
                          }}
                        >
                          {p.label}
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}

                {step === 3 && purpose && (
                  <div className="grid gap-4">
                    {packs.map((pack) => (
                      <button
                        key={pack.id}
                        type="button"
                        onClick={() => {
                          setPackId(pack.id);
                          setConfirmed(false);
                          setPhase("wizard");
                          setJobs([]);
                          setReadyCount(0);
                          setProduceNote(null);
                        }}
                        className={`rounded-sm border p-4 text-left backdrop-blur-md transition ${
                          packId === pack.id
                            ? "border-[#8CFF4D]/70"
                            : "border-white/20 hover:border-white/35"
                        }`}
                        style={{
                          backgroundColor:
                            packId === pack.id
                              ? "rgba(140,255,77,0.20)"
                              : "rgba(0,0,0,0.85)",
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">{pack.title}</span>
                          <span className="mono text-[11px] text-[#8CFF4D]/90">
                            {pack.frames.length} kare
                          </span>
                        </div>
                        <ul className="mt-3 flex flex-wrap gap-1.5">
                          {pack.frames.map((f) => (
                            <li
                              key={f}
                              className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/65"
                            >
                              {f}
                            </li>
                          ))}
                        </ul>
                      </button>
                    ))}
                  </div>
                )}

                {step === 4 && (
                  <div>
                    <p className="mb-2 text-[14px] text-white/65">
                      Her kareye eklenecek ekstra açılar (opsiyonel). Üretim
                      kuyruğu en fazla {FRAME_QUEUE_LIMIT} kare.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ANGLES.map((a) => (
                        <Chip
                          key={a.id}
                          active={angles.includes(a.id)}
                          onClick={() => toggleAngle(a.id)}
                        >
                          {a.label}
                        </Chip>
                      ))}
                    </div>

                    {confirmed && summary && (
                      <div className="mt-6 space-y-4">
                        <div
                          className="rounded-sm border border-[#8CFF4D]/35 p-4 text-[13px] backdrop-blur-md"
                          style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
                        >
                          <p className="font-medium text-[#8CFF4D]">
                            Seçim kilitlendi — {summary.total} çıktı
                            hazırlanacak
                            {summary.truncated
                              ? ` / ${summary.fullTotal}`
                              : ""}
                          </p>
                          <p className="mt-2 text-white/70">
                            {summary.purposeLabel} · {summary.channelLabel} ·{" "}
                            {summary.pack.title}
                          </p>
                        </div>

                        <div
                          id="studio-upload"
                          className="rounded-sm border border-dashed border-white/25 p-4 backdrop-blur-md"
                          style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
                        >
                          <p className="text-[13px] font-medium text-white">
                            Kaynak görsel + dekupe
                          </p>
                          <p className="mt-1 text-[12px] text-white/50">
                            Tek görsel yükle. ISNet hızlı önizleme; üretimde
                            BiRefNet (MIT) + hole-fill + matting. Cutout oturumda
                            tutulur ve senaryo motoruna verilir.
                          </p>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(e) =>
                              onPickFile(e.target.files?.[0] ?? null)
                            }
                          />
                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="rounded-sm border border-white/25 px-3 py-2 text-[12px] text-white/85 hover:border-white/40"
                            >
                              {uploadFile ? "Görseli değiştir" : "Görsel seç"}
                            </button>
                            {uploadFile && (
                              <span className="text-[12px] text-white/60">
                                {uploadFile.name}
                              </span>
                            )}
                            <label className="flex items-center gap-2 text-[12px] text-white/60">
                              Ürün türü
                              <select
                                data-testid="product-kind"
                                value={productKind}
                                onChange={(e) => setProductKind(e.target.value as ProductKind | "auto")}
                                className="rounded-sm border border-white/20 bg-black px-2 py-1.5 text-white/85"
                              >
                                {PRODUCT_KINDS.map((k) => (
                                  <option key={k.id} value={k.id}>
                                    {k.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <button
                              type="button"
                              onClick={() => setShowRefineStub((v) => !v)}
                              className="rounded-sm border border-white/15 px-3 py-2 text-[12px] text-white/55"
                            >
                              Ürün seç / fırça
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowPaidStub((v) => !v)}
                              className="rounded-sm border border-white/15 px-3 py-2 text-[12px] text-white/55"
                            >
                              Zor SKU API (opsiyonel)
                            </button>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-3">
                            {uploadPreview && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={uploadPreview}
                                alt="Yüklenen görsel"
                                className="max-h-36 rounded-sm border border-white/15 object-contain"
                              />
                            )}
                            {activeCutout && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={activeCutout}
                                alt="Dekupe önizleme"
                                className="max-h-36 rounded-sm border border-[#8CFF4D]/30 object-contain"
                                style={{
                                  background:
                                    "repeating-conic-gradient(#444 0% 25%, #2a2a2a 0% 50%) 50% / 10px 10px",
                                }}
                              />
                            )}
                          </div>

                          {dekupeMsg && (
                            <p className="mt-3 text-[12px] text-[#8CFF4D]/90">
                              {previewBusy || finalBusy ? "… " : ""}
                              {dekupeMsg}
                            </p>
                          )}
                          {dekupeNotes.length > 0 && (
                            <p className="mt-1 text-[11px] text-white/40">
                              {dekupeNotes.join(" · ")}
                            </p>
                          )}
                          {produceNote && (
                            <p className="mt-3 text-[12px] text-[#8CFF4D]/90">
                              {produceNote}
                            </p>
                          )}

                          {showRefineStub && uploadPreview && (
                            <CutoutEditor
                              sourceUrl={uploadPreview}
                              cutoutUrl={cutoutUrl}
                              busy={finalBusy}
                              onCutWithRoi={(roi) => {
                                void ensureFinalCutout(uploadPreview, roi);
                              }}
                              onSave={(dataUrl) => {
                                setCutoutUrl(dataUrl);
                                persistCutout({
                                  cutoutDataUrl: dataUrl,
                                  previewDataUrl: previewCutoutUrl,
                                  usedHybrid: false,
                                  modelNotes: [...dekupeNotes, "Fırça rötuşu"],
                                  quality: "final",
                                  sourceHash: sourceHash(uploadPreview),
                                });
                                setDekupeMsg("Rötuş kaydedildi — üretim bu kesimi kullanır.");
                              }}
                            />
                          )}
                          {showPaidStub && (
                            <div className="mt-3 space-y-2 rounded-sm border border-white/10 bg-black/40 p-3 text-[12px] text-white/55">
                              <p>
                                {PAID_FALLBACK_DESIGN.note} Sağlayıcılar:{" "}
                                {PAID_FALLBACK_DESIGN.providers.join(", ")}.
                              </p>
                              <button
                                type="button"
                                disabled={paidBusy || !uploadPreview}
                                onClick={() => void runPaidFallback()}
                                className="rounded-sm border border-[#8CFF4D]/40 px-3 py-1.5 text-[12px] text-[#8CFF4D] disabled:opacity-40"
                              >
                                {paidBusy
                                  ? "Photoroom…"
                                  : "Ücretli dekupe dene"}
                              </button>
                              {paidNote && (
                                <p className="text-[11px] text-white/70">
                                  {paidNote}
                                </p>
                              )}
                            </div>
                          )}
                          {genConfigured !== null && (
                            <p className="mt-3 text-[11px] text-white/40">
                              GEN / fal.ai:{" "}
                              {genConfigured
                                ? "FAL_KEY tanımlı — üretken kareler canlı."
                                : "FAL_KEY yok — ürün her karede gerçek cutout ile kompozitlenir (elde / lifestyle / tuval)."}
                            </p>
                          )}
                        </div>

                        <ul
                          className="max-h-56 overflow-y-auto rounded-sm border border-white/15 p-3 text-[12px] text-white/75 backdrop-blur-md"
                          style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
                        >
                          {summary.outputList.map((item) => {
                            const needsGen =
                              /elde|ugc|lifestyle|talking-head|sepete|paket \/|stok hissi|before \/ after/i.test(
                                item,
                              );
                            return (
                              <li
                                key={item}
                                className="border-b border-white/5 py-1.5 last:border-0"
                              >
                                {needsGen ? `[GEN]: ${item}` : item}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            {phase === "wizard" ? (
              <button
                type="button"
                disabled={step === 1}
                onClick={() => {
                  setConfirmed(false);
                  setPhase("wizard");
                  setJobs([]);
                  setReadyCount(0);
                  setProduceNote(null);
                  setStep((s) => Math.max(1, s - 1));
                }}
                className="rounded-sm border border-white/20 bg-black/35 px-4 py-2 text-[12px] text-white/75 backdrop-blur-md disabled:opacity-30"
              >
                Geri
              </button>
            ) : (
              <button
                type="button"
                onClick={startFresh}
                className="rounded-sm border border-white/20 bg-black/35 px-4 py-2 text-[12px] text-white/75 backdrop-blur-md"
              >
                Yeni senaryo
              </button>
            )}
            {phase === "wizard" && step < 4 ? (
              <button
                type="button"
                disabled={!canNext}
                onClick={() => setStep((s) => s + 1)}
                className="rounded-sm bg-[#8CFF4D] px-5 py-2 text-[12px] font-semibold tracking-[0.06em] text-black disabled:opacity-40"
              >
                Devam
              </button>
            ) : (
              <button
                type="button"
                disabled={!summary || phase === "producing" || finalBusy}
                onClick={() => void handlePrimary()}
                className="rounded-sm bg-[#8CFF4D] px-5 py-2 text-[12px] font-semibold tracking-[0.06em] text-black disabled:opacity-40"
              >
                {phase === "producing" || finalBusy
                  ? "Üretiliyor…"
                  : phase === "done"
                    ? "Baştan başla"
                    : !confirmed
                      ? "Seçimi tamamla"
                      : !uploadFile
                        ? "Görsel yükle"
                        : "Üretimi başlat"}
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
