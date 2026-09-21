"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type Purpose = "marketplace" | "live" | "creator" | "artistic";

const PURPOSES: { id: Purpose; title: string; desc: string }[] = [
  {
    id: "marketplace",
    title: "Pazaryeri satışı",
    desc: "Amazon, Shopify, Hepsiburada, Trendyol, Etsy vitrin kareleri",
  },
  {
    id: "live",
    title: "Live ürün satışı",
    desc: "Canlı yayın vitrini, elde gösterim, CTA boşluklu kareler",
  },
  {
    id: "creator",
    title: "İçerik üretici",
    desc: "Reels, YouTube, feed — satış paketi değil, içerik odaklı",
  },
  {
    id: "artistic",
    title: "Sanatsal",
    desc: "Editorial, mood, fine-art ve sinematik kareler",
  },
];

const CHANNELS: Record<Purpose, { id: string; label: string }[]> = {
  marketplace: [
    { id: "amazon", label: "Amazon" },
    { id: "shopify", label: "Shopify" },
    { id: "hepsiburada", label: "Hepsiburada" },
    { id: "trendyol", label: "Trendyol" },
    { id: "etsy", label: "Etsy" },
  ],
  live: [
    { id: "tiktok", label: "TikTok Live" },
    { id: "ig-live", label: "Instagram Live" },
    { id: "trendyol-live", label: "Trendyol Canlı" },
    { id: "live-general", label: "Genel Live" },
  ],
  creator: [
    { id: "reels", label: "Reels / Shorts" },
    { id: "youtube", label: "YouTube" },
    { id: "feed", label: "Feed" },
    { id: "blog", label: "Blog / web" },
  ],
  artistic: [
    { id: "editorial", label: "Editorial" },
    { id: "print", label: "Print" },
    { id: "mood", label: "Mood board" },
    { id: "cinematic", label: "Cinematic" },
  ],
};

const PACKAGES: Record<
  Purpose,
  { id: string; title: string; frames: string[] }[]
> = {
  marketplace: [
    {
      id: "full-listing",
      title: "Tam listing seti (rakip üstü)",
      frames: [
        "Hero",
        "45°",
        "Detay / makro",
        "Ölçek",
        "Lifestyle",
        "Elde",
        "Flat lay",
        "Paket / unboxing",
        "Özellik / içerik",
        "Mobil crop",
        "A+ strip",
        "Varyant yan yana",
      ],
    },
    {
      id: "minimal-5",
      title: "Hızlı 5’li vitrin",
      frames: ["Hero", "45°", "Detay", "Lifestyle", "Elde"],
    },
  ],
  live: [
    {
      id: "live-full",
      title: "Live satış seti",
      frames: [
        "Thumbnail",
        "Vitrin hero",
        "Elde gösterim",
        "Yakın detay",
        "CTA boşluklu",
        "Sepete ekle anı",
        "Varyant karşılaştırma",
        "Stok hissi",
        "Multi-angle quick",
      ],
    },
  ],
  creator: [
    {
      id: "creator-full",
      title: "İçerik seti",
      frames: [
        "Hook kare",
        "Ürün reveal",
        "UGC hisli",
        "B-roll still",
        "Before / after",
        "Talking-head backdrop",
        "Caption-safe",
        "End card",
      ],
    },
  ],
  artistic: [
    {
      id: "art-full",
      title: "Sanatsal set",
      frames: [
        "Mood",
        "Cinematic wide",
        "Fine-art still",
        "Abstract crop",
        "Dramatic light",
        "Editorial portrait",
        "Negative space",
        "Texture makro",
      ],
    },
  ],
};

const ANGLES = [
  { id: "front", label: "Ön" },
  { id: "three-quarter", label: "3/4" },
  { id: "top", label: "Üst" },
  { id: "macro", label: "Makro" },
  { id: "low", label: "Düşük açı" },
];

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
  const [produceNote, setProduceNote] = useState<string | null>(null);
  const [phase, setPhase] = useState<"wizard" | "producing" | "done">("wizard");
  const [jobStatus, setJobStatus] = useState<("pending" | "running" | "ready")[]>(
    [],
  );
  const [readyCount, setReadyCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const packs = purpose ? PACKAGES[purpose] : [];
  const selectedPack = packs.find((p) => p.id === packId) ?? null;

  const canNext =
    (step === 1 && !!purpose) ||
    (step === 2 && !!channel) ||
    (step === 3 && !!packId) ||
    step === 4;

  const summary = useMemo(() => {
    if (!purpose || !channel || !selectedPack) return null;
    const angleLabels = angles.map(
      (id) => ANGLES.find((a) => a.id === id)?.label ?? id,
    );
    const outputList: string[] = [];
    for (const frame of selectedPack.frames) {
      outputList.push(frame);
      for (const a of angleLabels) {
        outputList.push(`${frame} · ${a}`);
      }
    }
    return {
      purposeLabel: PURPOSES.find((p) => p.id === purpose)?.title ?? "",
      channelLabel:
        CHANNELS[purpose].find((p) => p.id === channel)?.label ?? "",
      pack: selectedPack,
      angleLabels,
      outputList,
      total: outputList.length,
    };
  }, [purpose, channel, selectedPack, angles]);

  const toggleAngle = (id: string) => {
    setAngles((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
    setConfirmed(false);
    setProduceNote(null);
  };

  const clearUploadStorage = () => {
    try {
      sessionStorage.removeItem("dragon-studio-upload-v1");
    } catch {
      /* ignore */
    }
  };

  const persistUpload = (name: string, type: string, dataUrl: string) => {
    try {
      sessionStorage.setItem(
        "dragon-studio-upload-v1",
        JSON.stringify({ name, type, dataUrl, savedAt: Date.now() }),
      );
    } catch {
      /* quota / private mode — preview still works in-memory */
    }
  };

  const resetUpload = () => {
    setUploadFile(null);
    setUploadPreview(null);
    setProduceNote(null);
    setPhase("wizard");
    setJobStatus([]);
    setReadyCount(0);
    clearUploadStorage();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startFresh = () => {
    setStep(1);
    setPurpose(null);
    setChannel(null);
    setPackId(null);
    setAngles([]);
    setConfirmed(false);
    resetUpload();
  };

  // Restore uploaded image after refresh / remount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("dragon-studio-upload-v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        name?: string;
        type?: string;
        dataUrl?: string;
      };
      if (!parsed?.dataUrl || !parsed.name) return;
      setUploadPreview(parsed.dataUrl);
      // Reconstruct a File so uploadFile checks keep working
      void fetch(parsed.dataUrl)
        .then((r) => r.blob())
        .then((blob) => {
          const file = new File([blob], parsed.name!, {
            type: parsed.type || blob.type || "image/png",
          });
          setUploadFile(file);
        });
    } catch {
      /* ignore corrupt cache */
    }
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
    setProduceNote(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      if (!dataUrl) return;
      setUploadPreview(dataUrl);
      persistUpload(file.name, file.type, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handlePrimary = () => {
    if (!summary) return;
    if (phase === "done") {
      startFresh();
      return;
    }
    if (phase === "producing") return;
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
    if (!uploadFile) {
      fileInputRef.current?.click();
      return;
    }
    // Start production run (placeholder thumbs until AI engine is wired)
    const total = summary.outputList.length;
    setJobStatus(Array.from({ length: total }, () => "pending"));
    setReadyCount(0);
    setProduceNote(null);
    setPhase("producing");
  };

  useEffect(() => {
    if (phase !== "producing" || !summary) return;
    const total = summary.outputList.length;
    let i = 0;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      if (i >= total) {
        setPhase("done");
        return;
      }
      const idx = i;
      setJobStatus((prev) => {
        const next = [...prev];
        next[idx] = "running";
        return next;
      });
      window.setTimeout(() => {
        if (cancelled) return;
        setJobStatus((prev) => {
          const next = [...prev];
          next[idx] = "ready";
          return next;
        });
        setReadyCount((c) => c + 1);
        i += 1;
        window.setTimeout(tick, 90);
      }, 140);
    };
    const t = window.setTimeout(tick, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [phase, summary]);

  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-[100vw] overflow-x-clip text-white">
      {/* Same plan as homepage — visible through translucent UI */}
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

      <div className="relative z-10 px-[max(1.25rem,env(safe-area-inset-left))] pb-16 pt-[max(1.25rem,env(safe-area-inset-top))] pr-[max(1.25rem,env(safe-area-inset-right))]">
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
                  {phase === "done"
                    ? " — önizleme (AI motoru sonraki adımda gerçek kareleri üretecek)."
                    : "."}
                </p>
              </div>

              {uploadPreview && (
                <div
                  className="flex items-center gap-3 rounded-md border border-white/15 p-3 backdrop-blur-md"
                  style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={uploadPreview}
                    alt="Kaynak"
                    className="h-14 w-14 rounded-sm object-cover"
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
                {summary.outputList.map((label, idx) => {
                  const st = jobStatus[idx] ?? "pending";
                  return (
                    <div
                      key={`${label}-${idx}`}
                      className="relative overflow-hidden rounded-md border border-white/15 aspect-square"
                      style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
                    >
                      {st === "ready" && uploadPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={uploadPreview}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover opacity-80"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[11px] text-white/35">
                            {st === "running" ? "Üretiliyor…" : "Sırada"}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 pt-6">
                        <p className="text-[11px] leading-snug text-white/90">
                          {label}
                        </p>
                        <p
                          className={`mt-0.5 text-[10px] ${
                            st === "ready"
                              ? "text-[#8CFF4D]"
                              : st === "running"
                                ? "text-white/70"
                                : "text-white/40"
                          }`}
                        >
                          {st === "ready"
                            ? "Hazır"
                            : st === "running"
                              ? "İşleniyor"
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
            Amaç → platform/format → paket → isteğe bağlı açılar. Seçimi
            tamamlayınca üretilecek kare listesi çıkar.
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
                      setJobStatus([]);
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
                  {purpose === "marketplace" || purpose === "live"
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
                      setJobStatus([]);
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
                  Her kareye eklenecek ekstra açılar (opsiyonel)
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
                        Seçim kilitlendi — {summary.total} çıktı hazırlanacak
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
                        Kaynak görsel
                      </p>
                      <p className="mt-1 text-[12px] text-white/50">
                        Tek görsel yükle; seçilen paket + açılar bu görselden
                        üretilecek.
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
                      </div>
                      {uploadPreview && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={uploadPreview}
                          alt="Yüklenen görsel önizleme"
                          className="mt-3 max-h-40 rounded-sm border border-white/15 object-contain"
                        />
                      )}
                      {produceNote && (
                        <p className="mt-3 text-[12px] text-[#8CFF4D]/90">
                          {produceNote}
                        </p>
                      )}
                    </div>

                    <ul
                      className="max-h-56 overflow-y-auto rounded-sm border border-white/15 p-3 text-[12px] text-white/75 backdrop-blur-md"
                      style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
                    >
                      {summary.outputList.map((item) => (
                        <li
                          key={item}
                          className="border-b border-white/5 py-1.5 last:border-0"
                        >
                          {item}
                        </li>
                      ))}
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
                  setJobStatus([]);
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
                disabled={!summary || phase === "producing"}
                onClick={handlePrimary}
                className="rounded-sm bg-[#8CFF4D] px-5 py-2 text-[12px] font-semibold tracking-[0.06em] text-black disabled:opacity-40"
              >
                {phase === "producing"
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
