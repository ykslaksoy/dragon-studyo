import Link from "next/link";

export function SiteFooter() {
  return (
    <footer
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.06] bg-[#070708]/92 px-[max(1rem,env(safe-area-inset-left))] py-3 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center text-[11px] tracking-[0.06em] text-white/45">
        <Link
          href="/terms"
          className="text-white/55 transition-colors hover:text-[#8CFF4D]/90"
        >
          Kullanım Şartları
        </Link>
        <span className="hidden text-white/20 sm:inline" aria-hidden>
          ·
        </span>
        <Link
          href="/terms?lang=en"
          className="text-white/40 transition-colors hover:text-white/70"
        >
          Terms of Use
        </Link>
      </div>
    </footer>
  );
}
