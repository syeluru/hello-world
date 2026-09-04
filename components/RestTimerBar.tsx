"use client";

import { useEffect, useRef, useState } from "react";
import { adjustRestTimer, stopRestTimer } from "@/lib/actions";
import { useSettings, useStore } from "@/lib/store";
import { fmtClock } from "@/lib/util";
import { IClose, IMinus, IPlus } from "./Icons";

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [0, 0.18, 0.36].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, now + t);
      g.gain.exponentialRampToValueAtTime(0.3, now + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.15);
      o.connect(g).connect(ctx.destination);
      o.start(now + t);
      o.stop(now + t + 0.16);
    });
    if ("vibrate" in navigator) navigator.vibrate?.([200, 100, 200]);
  } catch {
    /* audio not available */
  }
}

export function RestTimerBar() {
  const timer = useStore((s) => s.activeWorkout?.restTimer ?? null);
  const settings = useSettings();
  const [now, setNow] = useState(Date.now());
  const firedFor = useRef<number | null>(null);

  useEffect(() => {
    if (!timer) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [timer]);

  useEffect(() => {
    if (!timer) {
      firedFor.current = null;
      return;
    }
    const remaining = timer.endsAt - now;
    if (remaining <= 0 && firedFor.current !== timer.endsAt) {
      firedFor.current = timer.endsAt;
      if (settings.restTimerSound) beep();
      const t = setTimeout(() => stopRestTimer(), 1200);
      return () => clearTimeout(t);
    }
  }, [timer, now, settings.restTimerSound]);

  if (!timer) return null;
  const remainingSec = Math.max(0, Math.ceil((timer.endsAt - now) / 1000));
  const pct = timer.totalSec > 0 ? Math.min(100, Math.max(0, (remainingSec / timer.totalSec) * 100)) : 0;

  return (
    <div className="rest-bar">
      <div className="hstack">
        <button className="iconbtn" onClick={() => adjustRestTimer(-15)} aria-label="Minus 15 seconds">
          <IMinus size={18} />
        </button>
        <div className="grow center">
          <div className="bold" style={{ fontSize: 22, fontVariantNumeric: "tabular-nums" }}>
            {fmtClock(remainingSec)}
          </div>
          <div className="tiny muted">Rest · {fmtClock(timer.totalSec)}</div>
        </div>
        <button className="iconbtn" onClick={() => adjustRestTimer(15)} aria-label="Plus 15 seconds">
          <IPlus size={18} />
        </button>
        <button className="btn xs" onClick={stopRestTimer} style={{ marginLeft: 4 }}>
          Skip <IClose size={14} />
        </button>
      </div>
      <div className="track">
        <div className="fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
