import type { Locale } from "./dictionaries";

export type TermsContent = {
  title: string;
  effectiveDateLabel: string;
  effectiveDate: string;
  intro: string;
  sections: { heading: string; body: string }[];
  contactLabel: string;
  contactHref: string;
  contactText: string;
  backHome: string;
};

/** Public site URL documented in README — no personal contact data in repo. */
export const TERMS_CONTACT_URL = "https://dragon-studyo.vercel.app";

const tr: TermsContent = {
  title: "Kullanım Şartları",
  effectiveDateLabel: "Yürürlük tarihi",
  effectiveDate: "20 Ekim 2026",
  intro:
    "Dragon Stüdyo web sitesi ve hizmetlerini (“Hizmet”) kullanarak bu Kullanım Şartları’nı okuduğunuzu ve kabul ettiğinizi beyan edersiniz. Hizmet, Yüksel Aksoy (“İşletmeci”) tarafından sunulmaktadır.",
  sections: [
    {
      heading: "1. Otomatik erişim yasağı",
      body:
        "Hizmete botlar, betikler, tarayıcılar (crawler), scraper’lar, yapay zekâ aracıları veya diğer otomatik araçlarla, İşletmeci’nin yazılı izni olmadan erişemez, Hizmeti kullanamaz veya Hizmet üzerinden işlem yapamazsınız.",
    },
    {
      heading: "2. Veri ve içerik toplama yasağı",
      body:
        "Hizmetten veya Hizmet aracılığıyla sunulan içerikten veri veya içerik toplayamaz, kopyalayamaz, indeksleyemez, derleyemez veya “harvest” edemezsiniz.",
    },
    {
      heading: "3. Tersine mühendislik ve kopyalama yasağı",
      body:
        "Hizmetin yazılımını, tasarımını veya içeriğini tersine mühendislik yapamaz, kaynak koda dönüştüremez, kopyalayamaz, çoğaltamaz veya türev çalışmalar oluşturamazsınız.",
    },
    {
      heading: "4. Rekabet amaçlı kullanım yasağı",
      body:
        "Hizmeti, rakip bir ürün veya hizmet geliştirmek, eğitmek, test etmek veya kıyaslamak (benchmark) amacıyla kullanamazsınız.",
    },
    {
      heading: "5. Hesap askıya alma ve fesih",
      body:
        "Bu şartların ihlali halinde İşletmeci, önceden bildirimde bulunmaksızın erişiminizi askıya alabilir veya hesabınızı (varsa) sonlandırabilir ve gerekli gördüğü teknik veya hukuki önlemleri alabilir.",
    },
    {
      heading: "6. Uygulanacak hukuk ve yetki",
      body:
        "Bu Kullanım Şartları Türkiye Cumhuriyeti kanunlarına tabidir. Uyuşmazlıklarda Türkiye mahkemeleri ve icra daireleri münhasır yetkilidir.",
    },
  ],
  contactLabel: "İletişim",
  contactHref: TERMS_CONTACT_URL,
  contactText: TERMS_CONTACT_URL,
  backHome: "Ana sayfa",
};

const en: TermsContent = {
  title: "Terms of Use",
  effectiveDateLabel: "Effective date",
  effectiveDate: "October 20, 2026",
  intro:
    "By using the Dragon Stüdyo website and services (the “Service”), you acknowledge that you have read and agree to these Terms of Use. The Service is operated by Yüksel Aksoy (“Operator”).",
  sections: [
    {
      heading: "1. No automated access",
      body:
        "You may not access or use the Service through bots, scripts, crawlers, scrapers, AI agents, or other automated means without the Operator’s prior written permission.",
    },
    {
      heading: "2. No data or content harvesting",
      body:
        "You may not collect, copy, index, compile, or harvest data or content from the Service or content made available through it.",
    },
    {
      heading: "3. No reverse engineering or copying",
      body:
        "You may not reverse engineer, decompile, copy, reproduce, or create derivative works from the Service’s software, design, or content.",
    },
    {
      heading: "4. No competitive use",
      body:
        "You may not use the Service to build, train, test, or benchmark a competing product or service.",
    },
    {
      heading: "5. Suspension and termination",
      body:
        "If you violate these terms, the Operator may suspend or terminate your access or account (if any), with or without notice, and take any technical or legal measures it deems appropriate.",
    },
    {
      heading: "6. Governing law and jurisdiction",
      body:
        "These Terms of Use are governed by the laws of the Republic of Turkey. The courts and enforcement offices of Turkey have exclusive jurisdiction over disputes.",
    },
  ],
  contactLabel: "Contact",
  contactHref: TERMS_CONTACT_URL,
  contactText: TERMS_CONTACT_URL,
  backHome: "Home",
};

export function getTermsContent(locale: Locale): TermsContent {
  if (locale === "tr") return tr;
  return en;
}
