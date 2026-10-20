export type Locale = "tr" | "en" | "de" | "fr" | "zh" | "ru";

export type Dictionary = {
  brand: string;
  headerTag: string;
  awaken: string;
  heroMeta: string;
  title: string;
  subtitle: string;
  cta: string;
  soon: string;
  langAria: string;
};

export const LOCALE_META: {
  code: Locale;
  name: string;
  flagSrc: string;
}[] = [
  { code: "tr", name: "Türkçe", flagSrc: "/flags/tr.svg" },
  { code: "en", name: "English", flagSrc: "/flags/en.svg" },
  { code: "de", name: "Deutsch", flagSrc: "/flags/de.svg" },
  { code: "fr", name: "Français", flagSrc: "/flags/fr.svg" },
  { code: "zh", name: "中文", flagSrc: "/flags/zh.svg" },
  { code: "ru", name: "Русский", flagSrc: "/flags/ru.svg" },
];

export const DEFAULT_LOCALE: Locale = "tr";

export const dictionaries: Record<Locale, Dictionary> = {
  tr: {
    brand: "DRAGON STÜDYO",
    headerTag: "STUDIO • YAYINDA",
    awaken: "Dragon Uyanıyor",
    heroMeta: "CREATIVE STUDIO",
    title: "Dragon Stüdyo",
    subtitle:
      "Ürün görseli sihirbazı canlı: amaç, kanal, paket ve açı seç; görsel yükle, üretim grid’ini izle.",
    cta: "Stüdyoya gir",
    soon: "PAZARYERI • LIVE • CREATOR",
    langAria: "Dil seçimi",
  },
  en: {
    brand: "DRAGON STUDIO",
    headerTag: "STUDIO • LIVE",
    awaken: "Dragon Awakens",
    heroMeta: "CREATIVE STUDIO",
    title: "Dragon Studio",
    subtitle:
      "Product-image wizard is live: pick purpose, channel, pack, and angles; upload a source image and watch the production grid.",
    cta: "Open studio",
    soon: "MARKETPLACE • LIVE • CREATOR",
    langAria: "Language selection",
  },
  de: {
    brand: "DRAGON STUDIO",
    headerTag: "STUDIO • LIVE",
    awaken: "Dragon erwacht",
    heroMeta: "CREATIVE STUDIO",
    title: "Dragon Studio",
    subtitle:
      "Produktbild-Assistent ist live: Zweck, Kanal, Paket und Perspektiven wählen, Bild hochladen, Raster verfolgen.",
    cta: "Studio öffnen",
    soon: "MARKETPLACE • LIVE • CREATOR",
    langAria: "Sprachauswahl",
  },
  fr: {
    brand: "DRAGON STUDIO",
    headerTag: "STUDIO • EN LIGNE",
    awaken: "Dragon s’éveille",
    heroMeta: "CREATIVE STUDIO",
    title: "Dragon Studio",
    subtitle:
      "Assistant visuel produit en ligne : objectif, canal, pack et angles ; importez une image et suivez la grille.",
    cta: "Ouvrir le studio",
    soon: "MARKETPLACE • LIVE • CREATOR",
    langAria: "Choix de la langue",
  },
  zh: {
    brand: "DRAGON STUDIO",
    headerTag: "STUDIO • 已上线",
    awaken: "龙已苏醒",
    heroMeta: "CREATIVE STUDIO",
    title: "Dragon Studio",
    subtitle: "产品图像向导已上线：选择用途、渠道、套装与角度，上传源图并查看生成网格。",
    cta: "进入工作室",
    soon: "MARKETPLACE • LIVE • CREATOR",
    langAria: "语言选择",
  },
  ru: {
    brand: "DRAGON STUDIO",
    headerTag: "STUDIO • В ЭФИРЕ",
    awaken: "Дракон пробуждается",
    heroMeta: "CREATIVE STUDIO",
    title: "Dragon Studio",
    subtitle:
      "Мастер визуалов для товаров в эфире: цель, канал, пакет и ракурсы; загрузите фото и следите за сеткой.",
    cta: "В студию",
    soon: "MARKETPLACE • LIVE • CREATOR",
    langAria: "Выбор языка",
  },
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.tr;
}
