"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Phase = "hidden" | "opening" | "open";

const REVEAL_MS = 3000;
const OPEN_MS = 900;

function phaseFromSearch(): Phase | null {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("logo");
  if (v === "hidden" || v === "closed") return "hidden";
  if (v === "open" || v === "idle") return "open";
  if (v === "opening") return "opening";
  return null;
}

/**
 * Same top-logo treatment as ykslaksoy/dragon:
 * hidden → eye-open reveal → idle blink.
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
      const wait = 5500 + Math.random() * 1500;
      timer = window.setTimeout(() => {
        setBlinking(true);
        window.setTimeout(() => {
          setBlinking(false);
          schedule();
        }, 140);
      }, wait);
    };
    timer = window.setTimeout(schedule, 500);
    return () => window.clearTimeout(timer);
  }, [phase, locked]);

  const visible = phase !== "hidden";
  const lidsClosed = phase === "hidden" || blinking;

  return (
    <div
      className="relative h-[40px] w-[100px] bg-[#070708] sm:h-[48px] sm:w-[120px]"
      aria-label="Dragon Stüdyo logo"
      aria-hidden={phase === "hidden"}
      data-logo-phase={phase}
      data-logo-locked={locked ? "1" : "0"}
    >
      <div
        className="relative h-full w-full overflow-hidden bg-[#070708]"
        style={{
          opacity: visible ? 1 : 0,
          transform: lidsClosed ? "scaleY(0.05)" : "scaleY(1)",
          transformOrigin: "50% 45%",
          transition: locked
            ? "none"
            : phase === "opening"
              ? "opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1), transform 0.85s cubic-bezier(0.16, 1, 0.3, 1)"
              : "opacity 0.35s ease, transform 0.14s ease",
          filter: "none",
          boxShadow: "none",
          backgroundColor: "#070708",
        }}
      >
        <Image
          src="/dragon-eyes.png"
          alt="Dragon"
          width={912}
          height={440}
          priority
          className="crisp-img h-auto w-full select-none bg-[#070708]"
          draggable={false}
          style={{
            filter: "none",
            boxShadow: "none",
            backgroundColor: "#070708",
          }}
        />
      </div>
    </div>
  );
}
