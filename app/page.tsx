"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { DragonTopLogo } from "./components/DragonTopLogo";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import {
  DEFAULT_LOCALE,
  getDictionary,
  type Locale,
} from "./i18n/dictionaries";

export default function Home() {
  const [lang, setLang] = useState<Locale>(DEFAULT_LOCALE);
  const t = getDictionary(lang);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : lang;
  }, [lang]);

  return (
    <div className="relative m-0 h-dvh max-h-dvh w-full overflow-hidden bg-[#070708] p-0 text-white selection:bg-[#8CFF4D]/30">
      {/* Full-bleed atmosphere — clipped, centered behind hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 50% 40%, rgba(140,255,77,0.07), transparent 55%), radial-gradient(ellipse 70% 50% at 50% 100%, rgba(20,24,18,0.9), #070708)",
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center pb-[min(6vh,3rem)]">
          <div className="atmosphere-drift w-[min(640px,88%)] max-w-full opacity-[0.24] sm:w-[min(860px,70%)] sm:opacity-[0.28]">
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

      {/* Soft vignette so type stays readable over the mark */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(180deg, #070708 0%, transparent 14%, transparent 70%, #070708 100%)",
        }}
      />

      {/* Floating header — does not consume vertical flex space */}
      <header
        id="top"
        className="absolute inset-x-0 top-0 z-50 m-0 flex h-[calc(56px+env(safe-area-inset-top,0px))] items-center justify-between overflow-hidden border-b border-white/[0.06] bg-[#070708]/92 pt-[env(safe-area-inset-top,0px)] pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] backdrop-blur-md sm:h-[calc(64px+env(safe-area-inset-top,0px))] sm:pl-[max(2rem,env(safe-area-inset-left,0px))] sm:pr-[max(2rem,env(safe-area-inset-right,0px))]"
      >
        <div className="flex min-w-0 items-center gap-3 sm:gap-5">
          <span className="truncate text-[12px] font-medium tracking-[0.22em] text-white sm:text-[15px] sm:tracking-[0.4em]">
            {t.brand}
          </span>
          <div className="mono hidden items-center gap-3 text-[10px] tracking-[0.2em] text-white/30 md:flex">
            <span className="h-px w-8 bg-white/10" />
            <span>{t.headerTag}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2.5 sm:gap-5">
          <LanguageSwitcher
            locale={lang}
            onChange={setLang}
            ariaLabel={t.langAria}
          />
          <DragonTopLogo />
        </div>
      </header>

      {/* Hero fills the first viewport and centers in it (header overlays) */}
      <main className="absolute inset-0 z-10 flex w-full items-center justify-center px-[max(1.25rem,env(safe-area-inset-left,0px))] pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pt-[calc(56px+env(safe-area-inset-top,0px))] pr-[max(1.25rem,env(safe-area-inset-right,0px))] sm:px-[max(2.5rem,env(safe-area-inset-left,0px))] sm:pr-[max(2.5rem,env(safe-area-inset-right,0px))] sm:pt-[calc(64px+env(safe-area-inset-top,0px))]">
        <div className="hero-stage flex w-full max-w-[34rem] flex-col items-center">
          <p className="hero-rise serif italic tracking-[0.02em] text-[clamp(22px,5vw,30px)] font-normal text-white/35">
            {t.awaken}
          </p>

          <div className="hero-rise hero-rise-delay mono mt-3 grid w-full max-w-[18rem] grid-cols-[1fr_auto_1fr] items-center gap-3 text-[9px] tracking-[0.28em] text-white/25 sm:max-w-[20rem] sm:gap-4 sm:text-[10px]">
            <span className="h-px w-full bg-white/15" aria-hidden />
            <span className="flex shrink-0 items-center gap-2">
              <span className="ember-pulse inline-block h-1.5 w-1.5 rounded-full bg-[#8CFF4D]" />
              {t.heroMeta}
            </span>
            <span className="h-px w-full bg-white/15" aria-hidden />
          </div>

          <h1 className="hero-rise hero-rise-delay mt-7 max-w-[18ch] text-center text-[clamp(36px,9vw,84px)] font-semibold leading-[0.92] tracking-[-0.04em] text-white sm:mt-10">
            {t.title}
          </h1>

          <p className="hero-rise hero-rise-delay-2 mt-5 max-w-[34rem] text-center text-[15px] leading-relaxed text-white/50 sm:mt-7 sm:text-[17px]">
            {t.subtitle}
          </p>

          <div className="hero-rise hero-rise-delay-2 mt-8 flex flex-col items-center gap-3 sm:mt-10 sm:flex-row sm:gap-4">
            <a
              href="#top"
              className="rounded-sm bg-[#8CFF4D] px-7 py-[12px] text-[12px] font-semibold tracking-[0.08em] text-black transition-transform hover:-translate-y-px sm:px-8 sm:py-[14px] sm:text-[13px]"
            >
              {t.cta}
            </a>
            <span className="mono text-[11px] tracking-[0.18em] text-white/30">
              {t.soon}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
