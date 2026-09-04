"use client";

import { useMemo, useState } from "react";
import { getExercise } from "@/lib/actions";
import { muscleLabel } from "@/lib/exercises";
import { useSettings, useStore } from "@/lib/store";
import { workoutDurationSec, workoutTotalReps, workoutVolume } from "@/lib/stats";
import type { MuscleGroup } from "@/lib/types";
import { fmtDuration, startOfWeek } from "@/lib/util";
import { useFormat } from "@/lib/useFormat";
import { BarChart } from "./Charts";
import { WeeklyChart } from "./HomeTab";
import { useStreak } from "./ProfileTab";
import { Segmented, TopBar } from "./ui";

type Range = "4w" | "12w" | "1y" | "all";

export function StatisticsScreen() {
  const workouts = useStore((s) => s.workouts);
  const customExercises = useStore((s) => s.customExercises);
  const settings = useSettings();
  const fmt = useFormat();
  const { current, weeksActive } = useStreak();
  const [range, setRange] = useState<Range>("12w");

  const filtered = useMemo(() => {
    if (range === "all") return workouts;
    const weeks = range === "4w" ? 4 : range === "12w" ? 12 : 52;
    const start = startOfWeek(Date.now(), settings.firstWeekday);
    start.setDate(start.getDate() - (weeks - 1) * 7);
    return workouts.filter((w) => w.startedAt >= start.getTime());
  }, [workouts, range, settings.firstWeekday]);

  const totals = useMemo(() => {
    const lookup = (id: string) => getExercise(id);
    const volume = filtered.reduce((a, w) => a + workoutVolume(w, lookup), 0);
    const duration = filtered.reduce((a, w) => a + workoutDurationSec(w), 0);
    const reps = filtered.reduce((a, w) => a + workoutTotalReps(w), 0);
    const sets = filtered.reduce((a, w) => a + w.exercises.reduce((b, e) => b + e.sets.length, 0), 0);
    return { volume, duration, reps, sets };
  }, [filtered, customExercises]); // eslint-disable-line react-hooks/exhaustive-deps

  const muscles = useMemo(() => {
    const count = new Map<MuscleGroup, number>();
    for (const w of filtered)
      for (const we of w.exercises) {
        const ex = getExercise(we.exerciseId);
        if (!ex) continue;
        const n = we.sets.filter((s) => s.type !== "warmup").length;
        count.set(ex.muscleGroup, (count.get(ex.muscleGroup) ?? 0) + n);
        for (const m of ex.secondaryMuscles) count.set(m, (count.get(m) ?? 0) + n * 0.5);
      }
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [filtered, customExercises]); // eslint-disable-line react-hooks/exhaustive-deps

  const topExercises = useMemo(() => {
    const count = new Map<string, number>();
    for (const w of filtered) for (const we of w.exercises) count.set(we.exerciseId, (count.get(we.exerciseId) ?? 0) + 1);
    return [...count.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, n]) => ({ name: getExercise(id)?.name ?? "Unknown", n }));
  }, [filtered, customExercises]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="screen">
      <TopBar onBack title="Statistics" />
      <div className="content">
        <div className="records-grid" style={{ marginBottom: 12 }}>
          <div className="card">
            <div className="label">Total workouts</div>
            <div className="value">{workouts.length}</div>
          </div>
          <div className="card">
            <div className="label">Week streak</div>
            <div className="value">🔥 {current}</div>
          </div>
          <div className="card">
            <div className="label">Active weeks</div>
            <div className="value">{weeksActive}</div>
          </div>
          <div className="card">
            <div className="label">All-time volume</div>
            <div className="value">{fmt.volume(workouts.reduce((a, w) => a + workoutVolume(w, (id) => getExercise(id)), 0))}</div>
          </div>
        </div>

        <WeeklyChart weeks={12} />

        <div className="section-title">Period</div>
        <Segmented
          value={range}
          onChange={setRange}
          options={[
            { id: "4w", label: "4 weeks" },
            { id: "12w", label: "12 weeks" },
            { id: "1y", label: "1 year" },
            { id: "all", label: "All" },
          ]}
        />
        <div className="records-grid" style={{ marginTop: 10 }}>
          <div className="card">
            <div className="label">Workouts</div>
            <div className="value">{filtered.length}</div>
          </div>
          <div className="card">
            <div className="label">Time</div>
            <div className="value">{fmtDuration(totals.duration)}</div>
          </div>
          <div className="card">
            <div className="label">Volume</div>
            <div className="value">{fmt.volume(totals.volume)}</div>
          </div>
          <div className="card">
            <div className="label">Sets / Reps</div>
            <div className="value">
              {totals.sets} / {totals.reps}
            </div>
          </div>
        </div>

        <div className="section-title">Muscle groups (sets)</div>
        <div className="card">
          {muscles.length === 0 ? (
            <div className="muted small center">No workouts in this period.</div>
          ) : (
            <BarChart bars={muscles.map(([m, n]) => ({ label: muscleLabel(m).slice(0, 6), value: Math.round(n) }))} />
          )}
        </div>

        <div className="section-title">Most performed exercises</div>
        <div className="card" style={{ padding: "4px 12px" }}>
          {topExercises.length === 0 && <div className="muted small center" style={{ padding: 10 }}>Nothing yet.</div>}
          {topExercises.map((e) => (
            <div key={e.name} className="settings-row">
              <div className="label">{e.name}</div>
              <div className="value">{e.n}×</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
