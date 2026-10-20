"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import {
  DEFAULT_LOCALE,
  getDictionary,
  type Locale,
} from "../i18n/dictionaries";
import { getTermsContent } from "../i18n/terms";

function termsLocale(locale: Locale): Locale {
  return locale === "tr" ? "tr" : "en";
}

function TermsPageContent() {
  const searchParams = useSearchParams();
  const langParam = searchParams.get("lang");
  const [langOverride, setLangOverride] = useState<Locale | null>(null);
  const lang: Locale =
    langOverride ??
    (langParam === "en" ? "en" : langParam === "tr" ? "tr" : DEFAULT_LOCALE);
  const t = getDictionary(lang);
  const terms = useMemo(() => getTermsContent(termsLocale(lang)), [lang]);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : lang;
  }, [lang]);

  const onLangChange = (next: Locale) => {
    setLangOverride(next);
    const contentLang = termsLocale(next);
    const url = new URL(window.location.href);
    if (contentLang === "tr") {
      url.searchParams.delete("lang");
    } else {
      url.searchParams.set("lang", "en");
    }
    window.history.replaceState(null, "", url.pathname + url.search);
  };

  return (
    <div className="relative min-h-dvh w-full max-w-[100vw] overflow-x-clip bg-[#070708] text-white pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))]">
      <header
        className="flex items-center justify-between gap-4 border-b border-white/[0.06] bg-[#070708]/92 px-[max(1.25rem,env(safe-area-inset-left))] py-4 pr-[max(1.25rem,env(safe-area-inset-right))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-md"
      >
        <Link
          href="/"
          className="truncate text-[12px] font-medium tracking-[0.22em] text-white/80 hover:text-white"
        >
          {t.brand}
        </Link>
        <LanguageSwitcher
          locale={lang}
          onChange={onLangChange}
          ariaLabel={t.langAria}
        />
      </header>

      <main
        className="mx-auto w-full max-w-2xl px-[max(1.25rem,env(safe-area-inset-left))] py-10 pr-[max(1.25rem,env(safe-area-inset-right))] sm:py-14"
      >
        <h1 className="text-[clamp(28px,5vw,40px)] font-semibold tracking-[-0.03em]">
          {terms.title}
        </h1>
        <p className="mono mt-3 text-[12px] tracking-[0.12em] text-white/45">
          {terms.effectiveDateLabel}: {terms.effectiveDate}
        </p>

        <p className="mt-8 text-[15px] leading-relaxed text-white/65">
          {terms.intro}
        </p>

        <div className="mt-10 space-y-8">
          {terms.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-[16px] font-semibold text-white/90">
                {section.heading}
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-white/60">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <p className="mt-10 text-[15px] text-white/60">
          {terms.contactLabel}:{" "}
          <a
            href={terms.contactHref}
            className="text-[#8CFF4D]/90 underline-offset-2 hover:underline"
            rel="noopener noreferrer"
          >
            {terms.contactText}
          </a>
        </p>

        <p className="mt-8">
          <Link
            href="/"
            className="text-[13px] tracking-[0.08em] text-white/50 hover:text-white/80"
          >
            ← {terms.backHome}
          </Link>
        </p>
      </main>
    </div>
  );
}

export default function TermsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-[#070708] px-6 py-16 text-white/50">
          …
        </div>
      }
    >
      <TermsPageContent />
    </Suspense>
  );
}
