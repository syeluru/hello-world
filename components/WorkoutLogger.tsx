"use client";

import { useEffect, useState } from "react";
import {
  MUSCLE_GROUPS,
  muscleLabel,
  todayISODate,
  type WorkoutLog,
} from "@/lib/types";
import { getWorkout, listWorkouts, upsertWorkout } from "@/lib/store";

export default function WorkoutLogger() {
  const [date, setDate] = useState(todayISODate());
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [history, setHistory] = useState<WorkoutLog[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    Promise.all([getWorkout(date), listWorkouts()])
      .then(([w, hist]) => {
        if (cancelled) return;
        setSelected(w?.muscle_groups ?? []);
        setNotes(w?.notes ?? "");
        setHistory(hist);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [date]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await upsertWorkout(date, selected, notes.trim());
      setHistory(await listWorkouts());
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card">
      <h2>Today&apos;s workout</h2>
      <p className="sub">Pick everything you hit — it saves per day.</p>

      <div className="row spread">
        <input
          className="input"
          style={{ maxWidth: 180 }}
          type="date"
          value={date}
          max={todayISODate()}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Workout date"
        />
        {savedFlash && <span className="ok-flash">Saved ✓</span>}
      </div>

      <div className="section-label">Muscle groups &amp; focus</div>
      <div className="chip-grid">
        {MUSCLE_GROUPS.map((m) => (
          <button
            key={m.id}
            className={`chip ${selected.includes(m.id) ? "on" : ""}`}
            onClick={() => toggle(m.id)}
            aria-pressed={selected.includes(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="section-label">Notes (optional)</div>
      <input
        className="input"
        placeholder="PRs, how it felt, anything worth remembering…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="row" style={{ marginTop: 18 }}>
        <button className="btn" onClick={save} disabled={saving}>
          {saving ? <span className="spin" /> : null}
          {saving ? "Saving…" : "Save workout"}
        </button>
      </div>

      {error && <div className="notice err">{error}</div>}

      <div className="section-label" style={{ marginTop: 26 }}>
        Recent days
      </div>
      {history.length === 0 ? (
        <p className="sub">Nothing logged yet — today is a good day to start.</p>
      ) : (
        <div>
          {history.map((w) => (
            <div className="history-item" key={w.id}>
              <span className="history-date">{formatDate(w.workout_date)}</span>
              <span className="mini-chips">
                {w.muscle_groups.length === 0 ? (
                  <span className="history-date">rest day</span>
                ) : (
                  w.muscle_groups.map((g) => (
                    <span className="mini-chip" key={g}>
                      {muscleLabel(g)}
                    </span>
                  ))
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
