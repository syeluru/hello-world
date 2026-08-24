"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MealLog, ParsedMeal } from "@/lib/types";
import { addMeal, deleteMeal, isToday, listMeals } from "@/lib/store";

// Minimal typings for the Web Speech API (not in TS's DOM lib everywhere)
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  start(): void;
  stop(): void;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as
    | (new () => SpeechRecognitionLike)
    | null;
}

export default function MealLogger() {
  const [description, setDescription] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [parsed, setParsed] = useState<ParsedMeal | null>(null);
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [logging, setLogging] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef("");
  const speechSupported = useMemo(() => getSpeechRecognition() !== null, []);

  useEffect(() => {
    listMeals()
      .then(setMeals)
      .catch((e: Error) => setError(e.message));
    return () => recognitionRef.current?.stop();
  }, []);

  const todayTotals = useMemo(() => {
    const t = meals.filter((m) => isToday(m.eaten_at));
    const r = (n: number) => Math.round(n * 10) / 10;
    return {
      calories: Math.round(t.reduce((s, m) => s + Number(m.calories), 0)),
      protein_g: r(t.reduce((s, m) => s + Number(m.protein_g), 0)),
      carbs_g: r(t.reduce((s, m) => s + Number(m.carbs_g), 0)),
      fat_g: r(t.reduce((s, m) => s + Number(m.fat_g), 0)),
    };
  }, [meals]);

  function toggleMic() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    baseTextRef.current = description ? `${description.trim()} ` : "";
    rec.onresult = (event) => {
      let finals = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) finals += res[0].transcript;
        else interim += res[0].transcript;
      }
      setDescription(baseTextRef.current + finals + interim);
    };
    rec.onerror = (e) => {
      setListening(false);
      if (e.error === "not-allowed") {
        setError("Microphone access was blocked — allow it in your browser.");
      }
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setError(null);
    setListening(true);
    rec.start();
  }

  async function analyze() {
    recognitionRef.current?.stop();
    setAnalyzing(true);
    setError(null);
    setParsed(null);
    try {
      const res = await fetch("/api/parse-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const body = (await res.json()) as ParsedMeal & { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Analysis failed.");
      if (body.items.length === 0) {
        setError(body.note || "Couldn't find any food in that — try rewording.");
      } else {
        setParsed(body);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function logMeal() {
    if (!parsed) return;
    setLogging(true);
    setError(null);
    try {
      const saved = await addMeal(description.trim(), parsed.items, parsed.totals);
      setMeals((prev) => [saved, ...prev]);
      setParsed(null);
      setDescription("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLogging(false);
    }
  }

  async function remove(id: string) {
    try {
      await deleteMeal(id);
      setMeals((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <section className="card">
      <h2>Log a meal</h2>
      <p className="sub">
        Type it or say it — Claude works out the calories and macros.
      </p>

      <textarea
        className="textarea"
        placeholder="e.g. two scrambled eggs with a slice of buttered sourdough and a banana smoothie"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className="row" style={{ marginTop: 12 }}>
        <button
          className="btn"
          onClick={analyze}
          disabled={analyzing || !description.trim()}
        >
          {analyzing ? <span className="spin" /> : null}
          {analyzing ? "Analyzing…" : "Analyze"}
        </button>
        {speechSupported ? (
          <button
            className={`btn icon ghost ${listening ? "mic-live" : ""}`}
            onClick={toggleMic}
            aria-label={listening ? "Stop listening" : "Speak your meal"}
            title={listening ? "Stop listening" : "Speak your meal"}
          >
            {listening ? "◼ Listening…" : "🎤 Speak"}
          </button>
        ) : (
          <span className="history-date">
            (voice input needs Chrome, Edge or Safari)
          </span>
        )}
      </div>

      {error && <div className="notice err">{error}</div>}

      {parsed && (
        <>
          <div className="section-label">What Claude found</div>
          <table className="item-table">
            <thead>
              <tr>
                <th>Item</th>
                <th className="num">kcal</th>
                <th className="num">P</th>
                <th className="num">C</th>
                <th className="num">F</th>
              </tr>
            </thead>
            <tbody>
              {parsed.items.map((it, i) => (
                <tr key={i}>
                  <td>
                    {it.name}
                    <span className="history-date"> · {it.quantity}</span>
                  </td>
                  <td className="num">{Math.round(it.calories)}</td>
                  <td className="num">{it.protein_g}g</td>
                  <td className="num">{it.carbs_g}g</td>
                  <td className="num">{it.fat_g}g</td>
                </tr>
              ))}
              <tr>
                <td>
                  <strong>Total</strong>
                </td>
                <td className="num">
                  <strong>{parsed.totals.calories}</strong>
                </td>
                <td className="num">
                  <strong>{parsed.totals.protein_g}g</strong>
                </td>
                <td className="num">
                  <strong>{parsed.totals.carbs_g}g</strong>
                </td>
                <td className="num">
                  <strong>{parsed.totals.fat_g}g</strong>
                </td>
              </tr>
            </tbody>
          </table>
          {parsed.note && <div className="notice">{parsed.note}</div>}
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn" onClick={logMeal} disabled={logging}>
              {logging ? "Logging…" : "Log this meal"}
            </button>
            <button className="btn ghost" onClick={() => setParsed(null)}>
              Discard
            </button>
          </div>
        </>
      )}

      <div className="section-label" style={{ marginTop: 26 }}>
        Today so far
      </div>
      <div className="stat-row">
        <div className="stat">
          <div className="v">{todayTotals.calories}</div>
          <div className="k">kcal</div>
        </div>
        <div className="stat">
          <div className="v">{todayTotals.protein_g}g</div>
          <div className="k">protein</div>
        </div>
        <div className="stat">
          <div className="v">{todayTotals.carbs_g}g</div>
          <div className="k">carbs</div>
        </div>
        <div className="stat">
          <div className="v">{todayTotals.fat_g}g</div>
          <div className="k">fat</div>
        </div>
      </div>

      <div className="section-label" style={{ marginTop: 22 }}>
        Recent meals
      </div>
      {meals.length === 0 ? (
        <p className="sub">No meals logged yet.</p>
      ) : (
        <div>
          {meals.slice(0, 10).map((m) => (
            <div className="history-item" key={m.id}>
              <div>
                <div className="meal-desc">{m.description}</div>
                <div className="history-date">{formatWhen(m.eaten_at)}</div>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <span className="meal-macros">
                  {Math.round(Number(m.calories))} kcal · P{" "}
                  {Number(m.protein_g)}g · C {Number(m.carbs_g)}g · F{" "}
                  {Number(m.fat_g)}g
                </span>
                <button
                  className="del"
                  onClick={() => remove(m.id)}
                  aria-label="Delete meal"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
