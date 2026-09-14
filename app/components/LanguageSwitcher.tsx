"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_META,
  type Locale,
} from "../i18n/dictionaries";

type Props = {
  locale: Locale;
  onChange: (locale: Locale) => void;
  ariaLabel: string;
};

/**
 * Dark pill control: flag + uppercase locale code + chevron.
 * Matches Dragon’s LanguageSwitcher (and Yüksel’s reference screenshot).
 */
export function LanguageSwitcher({ locale, onChange, ariaLabel }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = LOCALE_META.find((l) => l.code === locale) ?? LOCALE_META[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        data-lang-switcher
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-white/70 transition hover:bg-white/[0.06] hover:text-white"
      >
        <Image
          src={current.flagSrc}
          alt=""
          width={18}
          height={12}
          className="h-3 w-[18px] rounded-[2px] object-cover"
          unoptimized
        />
        <span className="mono tracking-wider uppercase">{locale}</span>
        <span className="text-[10px] leading-none text-white/80" aria-hidden>
          ▾
        </span>
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          data-lang-menu
          className="absolute right-0 z-[60] mt-2 min-w-[148px] overflow-hidden rounded-xl border border-white/10 bg-[#0E0E10] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
        >
          {LOCALE_META.map((item) => {
            const selected = item.code === locale;
            return (
              <li key={item.code} role="option" aria-selected={selected}>
                <button
                  type="button"
                  data-lang-option={item.code}
                  onClick={() => {
                    onChange(item.code);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] transition ${
                    selected
                      ? "bg-white/[0.08] text-white"
                      : "text-white/65 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <Image
                    src={item.flagSrc}
                    alt=""
                    width={20}
                    height={14}
                    className="h-3.5 w-5 shrink-0 rounded-[2px] object-cover"
                    unoptimized
                  />
                  <span>{item.name}</span>
                  <span className="mono ml-auto text-[10px] uppercase text-white/35">
                    {item.code}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export { DEFAULT_LOCALE };
