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
    subtitle: "Site yayında. İçerikler yakında burada olacak.",
    cta: "Keşfet",
    soon: "YAKINDA • STUDIO",
    langAria: "Dil seçimi",
  },
  en: {
    brand: "DRAGON STUDIO",
    headerTag: "STUDIO • LIVE",
    awaken: "Dragon Awakens",
    heroMeta: "CREATIVE STUDIO",
    title: "Dragon Studio",
    subtitle: "The site is live. Content is coming soon.",
    cta: "Explore",
    soon: "COMING SOON • STUDIO",
    langAria: "Language selection",
  },
  de: {
    brand: "DRAGON STUDIO",
    headerTag: "STUDIO • LIVE",
    awaken: "Dragon erwacht",
    heroMeta: "CREATIVE STUDIO",
    title: "Dragon Studio",
    subtitle: "Die Seite ist live. Inhalte folgen in Kürze.",
    cta: "Entdecken",
    soon: "DEMNÄCHST • STUDIO",
    langAria: "Sprachauswahl",
  },
  fr: {
    brand: "DRAGON STUDIO",
    headerTag: "STUDIO • EN LIGNE",
    awaken: "Dragon s’éveille",
    heroMeta: "CREATIVE STUDIO",
    title: "Dragon Studio",
    subtitle: "Le site est en ligne. Le contenu arrive bientôt.",
    cta: "Explorer",
    soon: "BIENTÔT • STUDIO",
    langAria: "Choix de la langue",
  },
  zh: {
    brand: "DRAGON STUDIO",
    headerTag: "STUDIO • 已上线",
    awaken: "龙已苏醒",
    heroMeta: "CREATIVE STUDIO",
    title: "Dragon Studio",
    subtitle: "网站已上线。内容即将呈现。",
    cta: "探索",
    soon: "即将推出 • STUDIO",
    langAria: "语言选择",
  },
  ru: {
    brand: "DRAGON STUDIO",
    headerTag: "STUDIO • В ЭФИРЕ",
    awaken: "Дракон пробуждается",
    heroMeta: "CREATIVE STUDIO",
    title: "Dragon Studio",
    subtitle: "Сайт уже в эфире. Контент скоро появится здесь.",
    cta: "Открыть",
    soon: "СКОРО • STUDIO",
    langAria: "Выбор языка",
  },
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.tr;
}
