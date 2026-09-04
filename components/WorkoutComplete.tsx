"use client";

import { useEffect } from "react";
import { getExercise } from "@/lib/actions";
import { popAll } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { fmtDuration } from "@/lib/util";
import { useFormat } from "@/lib/useFormat";
import { ExerciseAvatar } from "./ExercisePicker";
import { ITrophy } from "./Icons";
import { TopBar } from "./ui";
import { useWorkoutSummary } from "./WorkoutCard";

export function WorkoutComplete({ id }: { id: string }) {
  const w = useStore((s) => s.workouts.find((x) => x.id === id));
  useEffect(() => {
    if (!w) popAll();
  }, [w]);
  if (!w) return null;
  return <Inner id={id} />;
}

function Inner({ id }: { id: string }) {
  const w = useStore((s) => s.workouts.find((x) => x.id === id))!;
  const total = useStore((s) => s.workouts.length);
  const fmt = useFormat();
  const { volume, duration, prs } = useWorkoutSummary(w);
  return (
    <div className="screen no-tabs">
      <TopBar title="Workout Complete" />
      <div className="content center" style={{ paddingTop: 24 }}>
        <div style={{ fontSize: 56 }}>🎉</div>
        <h2 style={{ margin: "8px 0 4px" }}>Congratulations!</h2>
        <div className="muted">That&apos;s workout #{total}. Keep it up!</div>
        <h3 style={{ marginTop: 24 }}>{w.title}</h3>
        <div className="stats-row" style={{ justifyContent: "center", gap: 28, marginTop: 8 }}>
          <div className="stat">
            <span className="label">Duration</span>
            <span className="value accent">{fmtDuration(duration)}</span>
          </div>
          <div className="stat">
            <span className="label">Volume</span>
            <span className="value">{fmt.volume(volume)}</span>
          </div>
          <div className="stat">
            <span className="label">Records</span>
            <span className="value" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--yellow)" }}>
              <ITrophy size={16} /> {prs.size}
            </span>
          </div>
        </div>
        <div className="card" style={{ marginTop: 20, textAlign: "left" }}>
          {w.exercises.map((we) => {
            const ex = getExercise(we.exerciseId);
            if (!ex) return null;
            const exPrs = we.sets.filter((s) => prs.has(s.id)).length;
            return (
              <div className="feed-ex" key={we.id}>
                <ExerciseAvatar ex={ex} size="sm" />
                <div className="grow ellipsis">
                  {we.sets.length} × {ex.name}
                </div>
                {exPrs > 0 && (
                  <span className="badge pr">
                    <ITrophy size={11} /> {exPrs}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <button className="btn primary" style={{ marginTop: 20 }} onClick={popAll}>
          Done
        </button>
      </div>
    </div>
  );
}
