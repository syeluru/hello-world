"use client";

import { useState } from "react";
import { cloneExercises, createRoutine, deleteWorkout, editWorkout, getExercise, startFromExercises } from "@/lib/actions";
import { back } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { describeSet } from "@/lib/stats";
import { fmtDateLong, fmtDuration, fmtTime } from "@/lib/util";
import { useFormat } from "@/lib/useFormat";
import { ExerciseAvatar } from "./ExercisePicker";
import { ICopy, IEdit, IMore, IPlay, ITrash, ITrophy } from "./Icons";
import { Confirm, MenuItem, Sheet, TopBar, toast } from "./ui";
import { useWorkoutSummary } from "./WorkoutCard";

export function WorkoutDetail({ id }: { id: string }) {
  const w = useStore((s) => s.workouts.find((x) => x.id === id));
  const [menu, setMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!w) {
    return (
      <div className="screen">
        <TopBar onBack title="Workout" />
        <div className="empty">This workout no longer exists.</div>
      </div>
    );
  }
  return <WorkoutDetailInner id={id} menu={menu} setMenu={setMenu} confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete} />;
}

function WorkoutDetailInner({
  id,
  menu,
  setMenu,
  confirmDelete,
  setConfirmDelete,
}: {
  id: string;
  menu: boolean;
  setMenu: (v: boolean) => void;
  confirmDelete: boolean;
  setConfirmDelete: (v: boolean) => void;
}) {
  const w = useStore((s) => s.workouts.find((x) => x.id === id))!;
  const fmt = useFormat();
  const { volume, duration, prs } = useWorkoutSummary(w);
  const setFmt = { weight: (kg: number) => fmt.weight(kg), distance: fmt.distance, clock: fmt.clock };

  return (
    <div className="screen">
      <TopBar
        onBack
        title={w.title}
        right={
          <button className="iconbtn" onClick={() => setMenu(true)} aria-label="Options">
            <IMore />
          </button>
        }
      />
      <div className="content">
        <h2 style={{ margin: "4px 0 2px" }}>{w.title}</h2>
        <div className="small muted">
          {fmtDateLong(w.startedAt)} · {fmtTime(w.startedAt)}
        </div>
        {w.description && (
          <div className="small" style={{ marginTop: 8 }}>
            {w.description}
          </div>
        )}
        <div className="stats-row" style={{ marginTop: 12 }}>
          <div className="stat">
            <span className="label">Duration</span>
            <span className="value accent">{fmtDuration(duration)}</span>
          </div>
          <div className="stat">
            <span className="label">Volume</span>
            <span className="value">{fmt.volume(volume)}</span>
          </div>
          <div className="stat">
            <span className="label">Sets</span>
            <span className="value">{w.exercises.reduce((a, e) => a + e.sets.length, 0)}</span>
          </div>
          <div className="stat">
            <span className="label">Records</span>
            <span className="value" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <ITrophy size={16} /> {prs.size}
            </span>
          </div>
        </div>

        {w.exercises.map((we) => {
          const ex = getExercise(we.exerciseId);
          if (!ex) return null;
          let n = 0;
          return (
            <div className="card" key={we.id} style={{ marginTop: 12, padding: "12px 12px 6px" }}>
              <div className="hstack" style={{ marginBottom: 6 }}>
                <ExerciseAvatar ex={ex} size="sm" />
                <div className="bold accent grow">{ex.name}</div>
              </div>
              {we.notes && (
                <div className="small muted" style={{ marginBottom: 6 }}>
                  {we.notes}
                </div>
              )}
              <table className="set-table">
                <thead>
                  <tr>
                    <th className="col-set">Set</th>
                    <th style={{ textAlign: "left" }}>{ex.type === "reps_only" ? "Reps" : ex.type === "duration" ? "Time" : "Weight & Reps"}</th>
                    <th className="col-check" />
                  </tr>
                </thead>
                <tbody>
                  {we.sets.map((s) => {
                    const label = s.type === "warmup" ? "W" : s.type === "drop" ? "D" : s.type === "failure" ? "F" : String(++n);
                    const pr = prs.get(s.id);
                    return (
                      <tr key={s.id}>
                        <td className="col-set">
                          <span className={`set-num ${s.type}`}>{label}</span>
                        </td>
                        <td style={{ textAlign: "left", fontWeight: 600 }}>{describeSet(s, ex.type, setFmt)}</td>
                        <td className="col-check">
                          {pr && (
                            <span className="badge pr" title={pr.join(", ")}>
                              <ITrophy size={11} /> PR
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      <Sheet open={menu} onClose={() => setMenu(false)}>
        <MenuItem
          icon={<IPlay size={20} />}
          label="Repeat Workout"
          onClick={() => {
            setMenu(false);
            startFromExercises(w.title, w.exercises, w.description);
          }}
        />
        <MenuItem
          icon={<ICopy size={20} />}
          label="Save as Routine"
          onClick={() => {
            createRoutine({ title: w.title, exercises: cloneExercises(w.exercises) });
            setMenu(false);
            toast("Routine saved");
          }}
        />
        <MenuItem
          icon={<IEdit size={20} />}
          label="Edit Workout"
          onClick={() => {
            setMenu(false);
            editWorkout(w.id);
          }}
        />
        <MenuItem
          icon={<ITrash size={20} />}
          label="Delete Workout"
          danger
          onClick={() => {
            setMenu(false);
            setConfirmDelete(true);
          }}
        />
      </Sheet>
      <Confirm
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete workout?"
        message="This workout will be permanently removed from your history."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          deleteWorkout(w.id);
          toast("Workout deleted");
          back();
        }}
      />
    </div>
  );
}
