"use client";

import { useMemo, useState } from "react";
import { deleteWorkout, editWorkout, createRoutine, cloneExercises, startFromExercises } from "@/lib/actions";
import { useSettings, useStore } from "@/lib/store";
import { workoutDurationSec, workoutTotalReps, workoutVolume } from "@/lib/stats";
import { getExercise } from "@/lib/actions";
import { startOfWeek } from "@/lib/util";
import { useFormat } from "@/lib/useFormat";
import { BarChart } from "./Charts";
import { ICopy, IEdit, IPlay, ITrash } from "./Icons";
import { Confirm, EmptyState, MenuItem, Segmented, Sheet, TopBar, toast } from "./ui";
import { WorkoutCard } from "./WorkoutCard";

type Metric = "workouts" | "duration" | "volume" | "reps";

export function WeeklyChart({ weeks = 8 }: { weeks?: number }) {
  const workouts = useStore((s) => s.workouts);
  const settings = useSettings();
  const customExercises = useStore((s) => s.customExercises);
  const fmt = useFormat();
  const [metric, setMetric] = useState<Metric>("workouts");
  const bars = useMemo(() => {
    const now = Date.now();
    const start = startOfWeek(now, settings.firstWeekday);
    const out: { label: string; value: number }[] = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const ws = new Date(start);
      ws.setDate(ws.getDate() - i * 7);
      const we = new Date(ws);
      we.setDate(we.getDate() + 7);
      const inWeek = workouts.filter((w) => w.startedAt >= ws.getTime() && w.startedAt < we.getTime());
      let value = 0;
      if (metric === "workouts") value = inWeek.length;
      else if (metric === "duration") value = Math.round(inWeek.reduce((a, w) => a + workoutDurationSec(w), 0) / 60);
      else if (metric === "volume") value = Math.round(inWeek.reduce((a, w) => a + workoutVolume(w, (id) => getExercise(id)), 0));
      else value = inWeek.reduce((a, w) => a + workoutTotalReps(w), 0);
      out.push({ label: ws.toLocaleDateString(undefined, { day: "numeric", month: "short" }), value });
    }
    return out;
  }, [workouts, metric, weeks, settings.firstWeekday, customExercises]); // eslint-disable-line react-hooks/exhaustive-deps

  const format = (v: number) => {
    if (metric === "duration") return v >= 60 ? `${Math.floor(v / 60)}h${v % 60 ? (v % 60) + "m" : ""}` : `${v}m`;
    if (metric === "volume") {
      const u = fmt.unit === "kg" ? v : v / 0.45359237;
      return u >= 1000 ? `${(u / 1000).toFixed(1)}k` : String(Math.round(u));
    }
    return String(v);
  };
  const thisWeek = bars[bars.length - 1]?.value ?? 0;
  return (
    <div className="card">
      <div className="row-between" style={{ marginBottom: 8 }}>
        <div>
          <div className="tiny muted bold">This week</div>
          <div className="bold" style={{ fontSize: 20 }}>
            {metric === "workouts"
              ? `${thisWeek} workout${thisWeek === 1 ? "" : "s"}`
              : metric === "duration"
                ? format(thisWeek)
                : metric === "volume"
                  ? fmt.volume(thisWeek)
                  : `${thisWeek} reps`}
          </div>
        </div>
      </div>
      <Segmented
        value={metric}
        onChange={setMetric}
        options={[
          { id: "workouts", label: "Workouts" },
          { id: "duration", label: "Duration" },
          { id: "volume", label: "Volume" },
          { id: "reps", label: "Reps" },
        ]}
      />
      <div style={{ marginTop: 10 }}>
        <BarChart bars={bars} format={format} highlightLast />
      </div>
    </div>
  );
}

export function HomeTab() {
  const workouts = useStore((s) => s.workouts);
  const sorted = useMemo(() => [...workouts].sort((a, b) => b.startedAt - a.startedAt), [workouts]);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const menuWorkout = workouts.find((w) => w.id === menuFor);

  return (
    <div className="screen">
      <TopBar large title="Home" />
      <div className="content">
        <WeeklyChart />
        <div className="section-title">History</div>
        {sorted.length === 0 ? (
          <EmptyState icon="🏋️" title="No workouts yet" text="Start a workout from the Workout tab. Finished workouts show up here.">
            <button className="btn primary" style={{ width: "auto" }} onClick={() => startFromExercises("Workout", [])}>
              Start Empty Workout
            </button>
          </EmptyState>
        ) : (
          sorted.map((w) => <WorkoutCard key={w.id} w={w} compact onMenu={() => setMenuFor(w.id)} />)
        )}
      </div>

      <Sheet open={!!menuWorkout} onClose={() => setMenuFor(null)}>
        {menuWorkout && (
          <>
            <div className="bold" style={{ padding: "4px 8px 8px" }}>
              {menuWorkout.title}
            </div>
            <MenuItem
              icon={<IPlay size={20} />}
              label="Repeat Workout"
              desc="Start a new workout with the same exercises"
              onClick={() => {
                setMenuFor(null);
                startFromExercises(menuWorkout.title, menuWorkout.exercises, menuWorkout.description);
              }}
            />
            <MenuItem
              icon={<ICopy size={20} />}
              label="Save as Routine"
              onClick={() => {
                createRoutine({ title: menuWorkout.title, exercises: cloneExercises(menuWorkout.exercises) });
                setMenuFor(null);
                toast("Routine saved");
              }}
            />
            <MenuItem
              icon={<IEdit size={20} />}
              label="Edit Workout"
              onClick={() => {
                setMenuFor(null);
                editWorkout(menuWorkout.id);
              }}
            />
            <MenuItem
              icon={<ITrash size={20} />}
              label="Delete Workout"
              danger
              onClick={() => {
                setMenuFor(null);
                setConfirmDelete(menuWorkout.id);
              }}
            />
          </>
        )}
      </Sheet>
      <Confirm
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete workout?"
        message="This workout will be permanently removed from your history."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (confirmDelete) deleteWorkout(confirmDelete);
          toast("Workout deleted");
        }}
      />
    </div>
  );
}
