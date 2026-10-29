/** Studio frame catalog — packages, angles, GEN labeling (TR). */

export type Purpose =
  | "marketplace"
  | "live"
  | "creator"
  | "artistic"
  | "multi-angle";

export type Realism = "canvas_ok" | "canvas_sim" | "needs_gen_ai";

export type FrameSpec = {
  label: string;
  displayLabel: string;
  baseFrame: string;
  angleLabel: string | null;
  realism: Realism;
};

export const PURPOSES: { id: Purpose; title: string; desc: string }[] = [
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
  {
    id: "multi-angle",
    title: "Çok açılı",
    desc: "Tek ürün, çok açı — listing ve stok için 24’lü kuyruk",
  },
];

export const CHANNELS: Record<Purpose, { id: string; label: string }[]> = {
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
  "multi-angle": [
    { id: "catalog", label: "Katalog" },
    { id: "pdp", label: "Ürün detay" },
    { id: "stock", label: "Stok / arşiv" },
  ],
};

export const PACKAGES: Record<
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
        "Giyili mannequin",
        "Negative space",
        "Texture makro",
      ],
    },
  ],
  "multi-angle": [
    {
      id: "angles-24",
      title: "24 kare açı kuyruğu",
      frames: [
        "Ön hero",
        "Ön yakın",
        "3/4 sol",
        "3/4 sağ",
        "Yan profil",
        "Üst bakış",
        "Düşük açı",
        "Makro dikiş",
        "Makro doku",
        "Arka görünüm",
        "45° ürün",
        "Flat lay merkez",
        "Ölçek referans",
        "Mobil kare",
        "Negatif boşluk",
        "Gölge stüdyo",
        "Aydınlık vitrin",
        "Koyu mood",
        "CTA boşluklu",
        "Özellik strip",
        "Lifestyle",
        "Elde",
        "UGC hisli",
        "Varyant yan yana",
      ],
    },
  ],
};

export const ANGLES = [
  { id: "front", label: "Ön" },
  { id: "three-quarter", label: "3/4" },
  { id: "top", label: "Üst" },
  { id: "macro", label: "Makro" },
  { id: "low", label: "Düşük açı" },
];

/** Max frames processed per production run (queue). */
export const FRAME_QUEUE_LIMIT = 24;

export function buildOutputList(
  frames: string[],
  angleLabels: string[],
): string[] {
  const out: string[] = [];
  for (const frame of frames) {
    out.push(frame);
    for (const a of angleLabels) {
      out.push(`${frame} · ${a}`);
    }
  }
  return out;
}

export function parseFrameLabel(label: string): {
  base: string;
  angle: string | null;
} {
  if (label.includes(" · ")) {
    const [base, angle] = label.split(" · ");
    return { base: base.trim(), angle: angle.trim() };
  }
  return { base: label.trim(), angle: null };
}

const NEEDS_GEN_AI_MARKERS = [
  "Elde",
  "Elde gösterim",
  "UGC",
  "Talking-head",
  "Before / after",
  "Sepete ekle",
  "Paket / unboxing",
  "Lifestyle",
  "Stok hissi",
] as const;

const SIMULATED_MARKERS = [
  "45°",
  "Flat lay",
  "Multi-angle",
  "Varyant",
  "Ölçek",
  "Ön",
  "3/4",
  "Üst",
  "Makro",
  "Düşük açı",
  "Abstract crop",
  "Cinematic wide",
  "Editorial portrait",
  "Yan profil",
  "Arka görünüm",
] as const;

export function classifyRealism(label: string): Realism {
  const { base, angle } = parseFrameLabel(label);
  const text = `${base} ${angle ?? ""}`.toLowerCase();
  for (const m of NEEDS_GEN_AI_MARKERS) {
    if (text.includes(m.toLowerCase())) return "needs_gen_ai";
  }
  for (const m of SIMULATED_MARKERS) {
    if (text.includes(m.toLowerCase())) return "canvas_sim";
  }
  return "canvas_ok";
}

export function frameSpec(label: string): FrameSpec {
  const { base, angle } = parseFrameLabel(label);
  const realism = classifyRealism(label);
  const displayLabel =
    realism === "needs_gen_ai" ? `[GEN]: ${label}` : label;
  return {
    label,
    displayLabel,
    baseFrame: base,
    angleLabel: angle,
    realism,
  };
}

export function queueFrames(labels: string[]): FrameSpec[] {
  return labels.slice(0, FRAME_QUEUE_LIMIT).map(frameSpec);
}
