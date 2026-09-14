import Image from "next/image";
import { DragonTopLogo } from "./components/DragonTopLogo";

export default function Home() {
  return (
    <div className="relative m-0 min-h-dvh overflow-hidden bg-[#070708] p-0 text-white selection:bg-[#8CFF4D]/30">
      {/* Full-bleed atmosphere — dragon mark ghost, same asset as Dragon */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 50% 18%, rgba(140,255,77,0.07), transparent 55%), radial-gradient(ellipse 70% 50% at 50% 100%, rgba(20,24,18,0.9), #070708)",
        }}
      />
      <div
        aria-hidden
        className="atmosphere-drift pointer-events-none fixed left-1/2 top-[42%] z-0 w-[min(720px,96vw)] -translate-x-1/2 -translate-y-1/2"
      >
        <Image
          src="/dragon-mark.png"
          alt=""
          width={1200}
          height={1100}
          priority
          className="ghost-mask h-auto w-full select-none"
          draggable={false}
        />
      </div>

      {/* Soft vignette so type stays readable over the mark */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(180deg, #070708 0%, transparent 18%, transparent 62%, #070708 100%)",
        }}
      />

      <header
        id="top"
        className="sticky top-0 z-50 m-0 flex h-[56px] items-center justify-between border-b border-white/[0.06] bg-[#070708]/92 px-4 backdrop-blur-md sm:h-[64px] sm:px-8"
      >
        <div className="flex min-w-0 items-center gap-3 sm:gap-5">
          <span className="shrink-0 text-[13px] font-medium tracking-[0.34em] text-white sm:text-[15px] sm:tracking-[0.4em]">
            DRAGON STÜDYO
          </span>
          <div className="mono hidden items-center gap-3 text-[10px] tracking-[0.2em] text-white/30 md:flex">
            <span className="h-px w-8 bg-white/10" />
            <span>STUDIO • YAYINDA</span>
          </div>
        </div>
        <DragonTopLogo />
      </header>

      <main className="relative z-10 flex min-h-[calc(100dvh-56px)] flex-col items-center justify-center px-5 pb-16 pt-10 sm:min-h-[calc(100dvh-64px)] sm:px-10 sm:pt-14">
        <p className="hero-rise serif italic tracking-[0.02em] text-[clamp(22px,5vw,30px)] font-normal text-white/35">
          Dragon awakens
        </p>

        <div className="hero-rise hero-rise-delay mono mt-3 flex items-center gap-3 text-[9px] tracking-[0.28em] text-white/25 sm:gap-4 sm:text-[10px]">
          <span className="h-px w-8 bg-white/10 sm:w-12" />
          <span className="flex items-center gap-2">
            <span className="ember-pulse inline-block h-1.5 w-1.5 rounded-full bg-[#8CFF4D]" />
            CREATIVE STUDIO
          </span>
          <span className="h-px w-8 bg-white/10 sm:w-12" />
        </div>

        <h1 className="hero-rise hero-rise-delay mt-8 max-w-[18ch] text-center text-[clamp(40px,9vw,84px)] font-semibold leading-[0.92] tracking-[-0.04em] text-white sm:mt-10">
          Dragon Stüdyo
        </h1>

        <p className="hero-rise hero-rise-delay-2 mt-6 max-w-[34rem] text-center text-[15px] leading-relaxed text-white/50 sm:mt-7 sm:text-[17px]">
          Site yayında. İçerikler yakında burada olacak.
        </p>

        <div className="hero-rise hero-rise-delay-2 mt-9 flex flex-col items-center gap-3 sm:mt-10 sm:flex-row sm:gap-4">
          <a
            href="#top"
            className="rounded-full bg-[#8CFF4D] px-7 py-[12px] text-[12px] font-semibold tracking-[0.08em] text-black transition-transform hover:-translate-y-px sm:px-8 sm:py-[14px] sm:text-[13px]"
          >
            Keşfet
          </a>
          <span className="mono text-[11px] tracking-[0.18em] text-white/30">
            YAKINDA • STUDIO
          </span>
        </div>
      </main>
    </div>
  );
}
