"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

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
          ? "border-[#8CFF4D]/70 bg-[#8CFF4D]/20 text-white"
          : "border-white/20 bg-white/[0.06] text-white/80 hover:border-white/35 hover:bg-white/[0.10]"
      }`}
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
  };

  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-[100vw] overflow-x-clip text-white">
      {/* Same plan as homepage — visible through translucent UI */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-[#070708]"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 55% at 50% 40%, rgba(140,255,77,0.07), transparent 55%), radial-gradient(ellipse 70% 50% at 50% 100%, rgba(20,24,18,0.9), #070708)",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center pb-[min(6vh,3rem)] opacity-55">
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
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(7,7,8,0.35) 0%, rgba(7,7,8,0.12) 40%, rgba(7,7,8,0.30) 100%)",
          }}
        />
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
            SENARYO / {step}/4
          </span>
        </header>

        <main className="mx-auto mt-10 w-full max-w-3xl">
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

          <section className="mt-8 rounded-md border border-white/20 bg-white/[0.07] p-5 shadow-[0_8px_40px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:p-6">
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
                    }}
                    className={`rounded-sm border p-4 text-left backdrop-blur-md transition ${
                      packId === pack.id
                        ? "border-[#8CFF4D]/70 bg-[#8CFF4D]/20"
                        : "border-white/20 bg-white/[0.06] hover:border-white/35 hover:bg-white/[0.10]"
                    }`}
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
                    <div className="rounded-sm border border-[#8CFF4D]/35 bg-[#8CFF4D]/10 p-4 text-[13px]">
                      <p className="font-medium text-[#8CFF4D]">
                        Seçim kilitlendi — {summary.total} çıktı hazırlanacak
                      </p>
                      <p className="mt-2 text-white/70">
                        {summary.purposeLabel} · {summary.channelLabel} ·{" "}
                        {summary.pack.title}
                      </p>
                      <p className="mt-2 text-[12px] text-white/50">
                        Görsel yükleyip üretmek bir sonraki adım (AI üretim
                        bağlantısı). Şimdilik üretilecek kare listesi aşağıda.
                      </p>
                    </div>
                    <ul className="max-h-56 overflow-y-auto rounded-sm border border-white/15 bg-white/[0.06] p-3 text-[12px] text-white/75 backdrop-blur-md">
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

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              disabled={step === 1}
              onClick={() => {
                setConfirmed(false);
                setStep((s) => Math.max(1, s - 1));
              }}
              className="rounded-sm border border-white/20 bg-black/35 px-4 py-2 text-[12px] text-white/75 backdrop-blur-md disabled:opacity-30"
            >
              Geri
            </button>
            {step < 4 ? (
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
                disabled={!summary}
                onClick={() => setConfirmed(true)}
                className="rounded-sm bg-[#8CFF4D] px-5 py-2 text-[12px] font-semibold tracking-[0.06em] text-black disabled:opacity-40"
              >
                Seçimi tamamla
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
