"use client";

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

const PLATFORMS: Record<Purpose, { id: string; label: string }[]> = {
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
      className={`rounded-sm border px-3 py-2 text-left text-[13px] transition ${
        active
          ? "border-[#8CFF4D]/70 bg-[#8CFF4D]/10 text-white"
          : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/25"
      }`}
    >
      {children}
    </button>
  );
}

export default function StudioPage() {
  const [step, setStep] = useState(1);
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [platform, setPlatform] = useState<string | null>(null);
  const [packId, setPackId] = useState<string | null>(null);
  const [angles, setAngles] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const packs = purpose ? PACKAGES[purpose] : [];
  const selectedPack = packs.find((p) => p.id === packId) ?? null;

  const summary = useMemo(() => {
    if (!purpose || !platform || !selectedPack) return null;
    const purposeLabel = PURPOSES.find((p) => p.id === purpose)?.title;
    const platformLabel = PLATFORMS[purpose].find((p) => p.id === platform)?.label;
    return { purposeLabel, platformLabel, pack: selectedPack, angles };
  }, [purpose, platform, selectedPack, angles]);

  const toggleAngle = (id: string) => {
    setAngles((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const canNext =
    (step === 1 && purpose) ||
    (step === 2 && platform) ||
    (step === 3 && packId) ||
    step === 4;

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[100vw] bg-[#070708] px-[max(1.25rem,env(safe-area-inset-left))] pb-16 pt-[max(1.25rem,env(safe-area-inset-top))] pr-[max(1.25rem,env(safe-area-inset-right))] text-white sm:px-10">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4">
        <Link
          href="/"
          className="text-[12px] tracking-[0.2em] text-white/50 hover:text-white"
        >
          ← Dragon Stüdyo
        </Link>
        <span className="mono text-[10px] tracking-[0.24em] text-[#8CFF4D]/80">
          SENARYO / {step}/4
        </span>
      </header>

      <main className="mx-auto mt-10 w-full max-w-3xl">
        <h1 className="text-[clamp(28px,6vw,44px)] font-semibold tracking-[-0.03em]">
          Ne için üretelim?
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/50">
          Amaç → platform/format → paket → isteğe bağlı açılar. Rakiplerin
          verdiğinden fazla hazır kare.
        </p>

        {/* steps */}
        <ol className="mt-8 flex flex-wrap gap-2">
          {["Amaç", "Platform", "Paket", "Açılar"].map((label, i) => {
            const n = i + 1;
            const active = step === n;
            const doneStep = step > n;
            return (
              <li
                key={label}
                className={`rounded-full px-3 py-1 text-[11px] tracking-[0.12em] ${
                  active
                    ? "bg-[#8CFF4D] text-black"
                    : doneStep
                      ? "bg-white/10 text-white/80"
                      : "bg-white/[0.04] text-white/35"
                }`}
              >
                {n}. {label}
              </li>
            );
          })}
        </ol>

        <section className="mt-8 rounded-md border border-white/10 bg-white/[0.02] p-5 sm:p-6">
          {step === 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {PURPOSES.map((p) => (
                <Chip
                  key={p.id}
                  active={purpose === p.id}
                  onClick={() => {
                    setPurpose(p.id);
                    setPlatform(null);
                    setPackId(null);
                  }}
                >
                  <div className="font-medium text-white">{p.title}</div>
                  <div className="mt-1 text-[12px] text-white/45">{p.desc}</div>
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
                {PLATFORMS[purpose].map((p) => (
                  <Chip
                    key={p.id}
                    active={platform === p.id}
                    onClick={() => setPlatform(p.id)}
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
                  onClick={() => setPackId(pack.id)}
                  className={`rounded-sm border p-4 text-left transition ${
                    packId === pack.id
                      ? "border-[#8CFF4D]/70 bg-[#8CFF4D]/10"
                      : "border-white/10 bg-white/[0.03] hover:border-white/25"
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
                        className="rounded-full bg-black/30 px-2 py-0.5 text-[11px] text-white/55"
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
              <p className="mb-2 text-[14px] text-white/60">
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
              {summary && (
                <div className="mt-6 rounded-sm border border-white/10 bg-black/30 p-4 text-[13px] text-white/70">
                  <p>
                    <span className="text-white/40">Amaç:</span>{" "}
                    {summary.purposeLabel}
                  </p>
                  <p className="mt-1">
                    <span className="text-white/40">Kanal:</span>{" "}
                    {summary.platformLabel}
                  </p>
                  <p className="mt-1">
                    <span className="text-white/40">Paket:</span>{" "}
                    {summary.pack.title} ({summary.pack.frames.length} kare)
                  </p>
                  <p className="mt-1">
                    <span className="text-white/40">Açılar:</span>{" "}
                    {summary.angles.length
                      ? summary.angles
                          .map(
                            (id) => ANGLES.find((a) => a.id === id)?.label ?? id,
                          )
                          .join(", ")
                      : "Yok (sadece paket)"}
                  </p>
                </div>
              )}
              {done && (
                <p className="mt-4 text-[13px] text-[#8CFF4D]">
                  Seçim kaydedildi (önizleme). Üretim motoru bir sonraki
                  adımda bağlanacak.
                </p>
              )}
            </div>
          )}
        </section>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => {
              setDone(false);
              setStep((s) => Math.max(1, s - 1));
            }}
            className="rounded-sm border border-white/15 px-4 py-2 text-[12px] text-white/70 disabled:opacity-30"
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
              onClick={() => setDone(true)}
              className="rounded-sm bg-[#8CFF4D] px-5 py-2 text-[12px] font-semibold tracking-[0.06em] text-black"
            >
              Seçimi tamamla
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
