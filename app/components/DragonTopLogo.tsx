"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Phase = "hidden" | "opening" | "open";

const REVEAL_MS = 2400;
const OPEN_MS = 750;

function phaseFromSearch(): Phase | null {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("logo");
  if (v === "hidden" || v === "closed") return "hidden";
  if (v === "open" || v === "idle") return "open";
  if (v === "opening") return "opening";
  return null;
}

/**
 * Top dragon-eyes mark — brighter / more alive than the base asset:
 * boosted brightness+saturation, lime glow, subtle pulse when open.
 * Optional `?logo=hidden|opening|open` locks phase for QA screenshots.
 */
export function DragonTopLogo() {
  const [phase, setPhase] = useState<Phase>("hidden");
  const [locked, setLocked] = useState(false);
  const [blinking, setBlinking] = useState(false);

  useEffect(() => {
    const fromQuery = phaseFromSearch();
    if (fromQuery) {
      setLocked(true);
      setPhase(fromQuery);
      return;
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setPhase("open");
      return;
    }

    const openTimer = window.setTimeout(() => setPhase("opening"), REVEAL_MS);
    const doneTimer = window.setTimeout(
      () => setPhase("open"),
      REVEAL_MS + OPEN_MS,
    );

    return () => {
      window.clearTimeout(openTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  useEffect(() => {
    if (phase !== "open" || locked) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let timer: number;
    const schedule = () => {
      // Slightly more frequent blinks → feels more alive
      const wait = 3800 + Math.random() * 2200;
      timer = window.setTimeout(() => {
        setBlinking(true);
        window.setTimeout(() => {
          setBlinking(false);
          schedule();
        }, 120);
      }, wait);
    };
    timer = window.setTimeout(schedule, 400);
    return () => window.clearTimeout(timer);
  }, [phase, locked]);

  const visible = phase !== "hidden";
  const lidsClosed = phase === "hidden" || blinking;
  const alive = phase === "open" && !blinking;

  return (
    <div
      className="relative h-[40px] w-[100px] bg-[#070708] sm:h-[48px] sm:w-[120px]"
      aria-label="Dragon Stüdyo logo"
      aria-hidden={phase === "hidden"}
      data-logo-phase={phase}
      data-logo-locked={locked ? "1" : "0"}
    >
      {/* Soft lime bloom behind the eyes */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-[-30%] z-0 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(140,255,77,0.45)_0%,rgba(140,255,77,0.12)_40%,transparent_70%)] transition-opacity duration-500 ${
          alive ? "eyes-glow-pulse opacity-100" : "opacity-0"
        }`}
      />
      <div
        className="relative z-10 h-full w-full overflow-hidden bg-[#070708]"
        style={{
          opacity: visible ? 1 : 0,
          transform: lidsClosed ? "scaleY(0.05)" : "scaleY(1)",
          transformOrigin: "50% 45%",
          transition: locked
            ? "none"
            : phase === "opening"
              ? "opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1), transform 0.75s cubic-bezier(0.16, 1, 0.3, 1)"
              : "opacity 0.3s ease, transform 0.12s ease",
          backgroundColor: "#070708",
        }}
      >
        <Image
          src="/dragon-eyes.png"
          alt="Dragon"
          width={912}
          height={440}
          priority
          className={`dragon-eyes-alive h-auto w-full select-none bg-[#070708] ${
            alive ? "eyes-alive-pulse" : ""
          }`}
          draggable={false}
          style={{
            backgroundColor: "#070708",
          }}
        />
      </div>
    </div>
  );
}
