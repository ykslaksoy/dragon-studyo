"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Phase = "hidden" | "opening" | "open";

const REVEAL_MS = 2200;
const OPEN_MS = 820;
/** Single blink duration — must match CSS `dragon-blink` */
const BLINK_MS = 320;
/** Occasional double-blink second tap */
const DOUBLE_GAP_MS = 110;

function phaseFromSearch(): Phase | null {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("logo");
  if (v === "hidden" || v === "closed") return "hidden";
  if (v === "open" || v === "idle") return "open";
  if (v === "opening") return "opening";
  if (v === "blink") return "open"; // open + force a blink for QA
  return null;
}

function wantsForcedBlink(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("logo") === "blink";
}

/**
 * Top dragon-eyes mark with:
 * - Soft elliptical blend into the dark header (no hard plate edge)
 * - Polished one-shot blink (fast close → brief hold → softer open)
 */
export function DragonTopLogo() {
  const [phase, setPhase] = useState<Phase>("hidden");
  const [locked, setLocked] = useState(false);
  const [blinking, setBlinking] = useState(false);
  const blinkLock = useRef(false);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  const runBlink = (double = false) => {
    if (blinkLock.current) return;
    blinkLock.current = true;
    setBlinking(true);

    const finish = () => {
      setBlinking(false);
      blinkLock.current = false;
    };

    if (double) {
      // First blink, brief reopen, second blink
      timers.current.push(
        window.setTimeout(() => {
          setBlinking(false);
          timers.current.push(
            window.setTimeout(() => {
              setBlinking(true);
              timers.current.push(
                window.setTimeout(() => {
                  finish();
                }, BLINK_MS),
              );
            }, DOUBLE_GAP_MS),
          );
        }, BLINK_MS),
      );
    } else {
      timers.current.push(window.setTimeout(finish, BLINK_MS));
    }
  };

  useEffect(() => {
    const fromQuery = phaseFromSearch();
    if (fromQuery) {
      setLocked(true);
      setPhase(fromQuery);
      if (wantsForcedBlink()) {
        timers.current.push(window.setTimeout(() => runBlink(false), 400));
      }
      return () => clearTimers();
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
    timers.current.push(openTimer, doneTimer);

    return () => clearTimers();
  }, []);

  useEffect(() => {
    if (phase !== "open" || locked) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let cancelled = false;
    let scheduleTimer: number;

    const schedule = () => {
      // Natural gap between blinks (~4–8s), with occasional double
      const wait = 4200 + Math.random() * 3800;
      scheduleTimer = window.setTimeout(() => {
        if (cancelled) return;
        const double = Math.random() < 0.22;
        runBlink(double);
        const after = double ? BLINK_MS * 2 + DOUBLE_GAP_MS + 40 : BLINK_MS + 40;
        timers.current.push(
          window.setTimeout(() => {
            if (!cancelled) schedule();
          }, after),
        );
      }, wait);
      timers.current.push(scheduleTimer);
    };

    scheduleTimer = window.setTimeout(schedule, 900);
    timers.current.push(scheduleTimer);

    return () => {
      cancelled = true;
      clearTimers();
    };
  }, [phase, locked]);

  const revealOpen = phase === "opening" || phase === "open";

  return (
    <div
      className="dragon-logo-stage relative h-[40px] w-[100px] overflow-hidden sm:h-[48px] sm:w-[120px]"
      aria-label="Dragon Stüdyo logo"
      aria-hidden={phase === "hidden"}
      data-logo-phase={phase}
      data-logo-locked={locked ? "1" : "0"}
      data-logo-blinking={blinking ? "1" : "0"}
    >
      {/* Soft lime bloom — kept inside the stage so it never overflows the viewport */}
      <div
        aria-hidden
        className={`dragon-logo-glow pointer-events-none absolute inset-[-12%] z-0 transition-opacity duration-500 ${
          phase === "open" && !blinking
            ? "eyes-glow-pulse opacity-100"
            : blinking
              ? "opacity-0 !duration-75"
              : phase === "opening"
                ? "opacity-50"
                : "opacity-0"
        }`}
      />

      <div
        className={`dragon-logo-blend relative z-10 h-full w-full ${
          blinking ? "dragon-blink" : ""
        } ${phase === "opening" ? "dragon-reveal-open" : ""} ${
          phase === "open" && !blinking ? "dragon-eyes-idle" : ""
        } ${phase === "hidden" ? "dragon-eyes-shut" : ""}`}
        style={{
          ...(locked && !blinking
            ? {
                opacity: revealOpen ? 1 : 0,
                clipPath:
                  phase === "hidden" ? "inset(46% 0 46% 0)" : "inset(0% 0 0% 0)",
              }
            : {}),
        }}
      >
        <Image
          src="/dragon-eyes.png"
          alt="Dragon"
          width={912}
          height={440}
          priority
          className={`dragon-eyes-alive h-auto w-full select-none ${
            phase === "open" && !blinking ? "eyes-alive-pulse" : ""
          } ${blinking ? "dragon-blink-dim" : ""}`}
          draggable={false}
        />
        {/* Edge wash into header ink — intentional ground blend */}
        <div aria-hidden className="dragon-logo-edge absolute inset-0 z-20" />
      </div>
    </div>
  );
}
