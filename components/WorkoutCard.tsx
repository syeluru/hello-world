"use client";

import { useMemo } from "react";
import { getExercise } from "@/lib/actions";
import { push } from "@/lib/nav";
import { useSettings, useStore } from "@/lib/store";
import { bestSet, describeSet, workoutDurationSec, workoutPRs, workoutVolume } from "@/lib/stats";
import type { Workout } from "@/lib/types";
import { fmtDuration, fmtRelative, initials } from "@/lib/util";
import { useFormat } from "@/lib/useFormat";
import { ExerciseAvatar } from "./ExercisePicker";
import { IMore, ITrophy } from "./Icons";

export function useWorkoutSummary(w: Workout) {
  const workouts = useStore((s) => s.workouts);
  const customExercises = useStore((s) => s.customExercises);
  return useMemo(() => {
    const lookup = (id: string) => getExercise(id);
    return {
      volume: workoutVolume(w, lookup),
      duration: workoutDurationSec(w),
      prs: workoutPRs(w, workouts, lookup),
    };
  }, [w, workouts, customExercises]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function WorkoutCard({ w, onMenu, compact }: { w: Workout; onMenu?: () => void; compact?: boolean }) {
  const settings = useSettings();
  const fmt = useFormat();
  const { volume, duration, prs } = useWorkoutSummary(w);
  const shown = compact ? w.exercises.slice(0, 3) : w.exercises;
  const hidden = w.exercises.length - shown.length;

  return (
    <div className="feed-card">
      <div className="head">
        <span className="avatar">{initials(settings.name)}</span>
        <div className="grow">
          <div className="bold">{settings.name}</div>
          <div className="tiny muted">{fmtRelative(w.startedAt)}</div>
        </div>
        {onMenu && (
          <button className="iconbtn" onClick={onMenu} aria-label="Workout options">
            <IMore />
          </button>
        )}
      </div>
      <button style={{ textAlign: "left", width: "100%" }} onClick={() => push({ type: "workoutDetail", id: w.id })}>
        <h4>{w.title}</h4>
        {w.description && (
          <div className="small muted" style={{ marginBottom: 8 }}>
            {w.description}
          </div>
        )}
        <div className="stats-row">
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
            <span className="value" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <ITrophy size={16} /> {prs.size}
            </span>
          </div>
        </div>
        <div className="divider" />
        <div className="tiny muted bold" style={{ marginBottom: 2 }}>
          Workout
        </div>
        {shown.map((we) => {
          const ex = getExercise(we.exerciseId);
          if (!ex) return null;
          const best = bestSet(we, ex.type);
          return (
            <div className="feed-ex" key={we.id}>
              <ExerciseAvatar ex={ex} size="sm" />
              <div className="grow">
                <div className="ellipsis">
                  {we.sets.length} × {ex.name}
                </div>
                {best && (
                  <div className="sub">
                    Best: {describeSet(best, ex.type, { weight: (kg) => fmt.weight(kg), distance: fmt.distance, clock: fmt.clock })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {hidden > 0 && (
          <div className="small muted" style={{ marginTop: 4 }}>
            See {hidden} more exercise{hidden === 1 ? "" : "s"}
          </div>
        )}
      </button>
    </div>
  );
}
