"use client";

import { useState } from "react";
import { createRoutine, getExercise, startFromExercises } from "@/lib/actions";
import { EXAMPLE_ROUTINES, exampleToExercises, type ExampleRoutine } from "@/lib/examples";
import { useStore } from "@/lib/store";
import { fmtDuration } from "@/lib/util";
import { ExerciseAvatar } from "./ExercisePicker";
import { Dialog, Sheet, TopBar, toast } from "./ui";

export function ExploreRoutines() {
  const [open, setOpen] = useState<ExampleRoutine | null>(null);
  const active = useStore((s) => s.activeWorkout);
  const [blocked, setBlocked] = useState<null | (() => void)>(null);
  const categories = Array.from(new Set(EXAMPLE_ROUTINES.map((r) => r.category)));

  const guard = (fn: () => void) => (active ? setBlocked(() => fn) : fn());

  return (
    <div className="screen">
      <TopBar onBack title="Explore Routines" />
      <div className="content">
        <div className="small muted" style={{ marginBottom: 8 }}>
          Sample programs to get started. Save one to My Routines and edit it however you like.
        </div>
        {categories.map((cat) => (
          <div key={cat}>
            <div className="section-title">{cat}</div>
            {EXAMPLE_ROUTINES.filter((r) => r.category === cat).map((r) => (
              <button key={r.id} className="card clickable" style={{ width: "100%", textAlign: "left", marginBottom: 10 }} onClick={() => setOpen(r)}>
                <div className="bold" style={{ fontSize: 16 }}>
                  {r.title}
                </div>
                <div className="small muted">{r.description}</div>
                <div className="tiny faint" style={{ marginTop: 4 }}>
                  {r.exercises.length} exercises
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>

      <Sheet open={!!open} onClose={() => setOpen(null)} tall>
        {open && (
          <>
            <h3>{open.title}</h3>
            <div className="small muted center" style={{ marginBottom: 12 }}>
              {open.description}
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {open.exercises.map((e, i) => {
                const ex = getExercise(exampleToExercises({ ...open, exercises: [e] })[0]!.exerciseId);
                return (
                  <div key={i} className="list-item">
                    {ex && <ExerciseAvatar ex={ex} size="sm" />}
                    <div className="grow">
                      <div className="name">{e.name}</div>
                      <div className="sub">
                        {e.sets} sets{e.reps ? ` × ${e.reps} reps` : ""}
                        {e.restSec ? ` · rest ${fmtDuration(e.restSec)}` : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="stack" style={{ paddingTop: 10 }}>
              <button
                className="btn primary"
                onClick={() => {
                  createRoutine({ title: open.title, notes: open.description, exercises: exampleToExercises(open) });
                  toast("Saved to My Routines");
                  setOpen(null);
                }}
              >
                Save to My Routines
              </button>
              <button
                className="btn"
                onClick={() => {
                  const r = open;
                  setOpen(null);
                  guard(() => startFromExercises(r.title, exampleToExercises(r), r.description));
                }}
              >
                Start Workout
              </button>
            </div>
          </>
        )}
      </Sheet>
      <Dialog open={!!blocked} onClose={() => setBlocked(null)} title="Workout in progress" message="Discard the current workout and start this one?">
        <button
          className="btn danger"
          onClick={() => {
            blocked?.();
            setBlocked(null);
          }}
        >
          Discard and start
        </button>
        <button className="btn" onClick={() => setBlocked(null)}>
          Cancel
        </button>
      </Dialog>
    </div>
  );
}
