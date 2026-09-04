"use client";

import { useEffect, useMemo, useState } from "react";
import {
  discardActive,
  finishActive,
  getExercise,
  setActiveMinimized,
  startRestTimer,
  updateActive,
  updateRoutineFromActive,
} from "@/lib/actions";
import { push, setTab } from "@/lib/nav";
import { useSettings, useStore } from "@/lib/store";
import { workoutCompletedSets, workoutPRs, workoutVolume } from "@/lib/stats";
import type { ActiveWorkout, SetEntry, WorkoutExercise } from "@/lib/types";
import { fmtClock, fmtDateLong, fmtTime } from "@/lib/util";
import { useFormat } from "@/lib/useFormat";
import { ExerciseEditor } from "./ExerciseEditor";
import { IChevronDown, ITimer } from "./Icons";
import { RestTimerBar } from "./RestTimerBar";
import { Confirm, Dialog, Sheet, TopBar, toast } from "./ui";
import { REST_OPTIONS } from "./ExerciseEditor";
import { fmtDuration } from "@/lib/util";

function useElapsed(startedAt: number, running: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);
  return Math.max(0, Math.floor((now - startedAt) / 1000));
}

export function ActiveWorkoutScreen({ aw }: { aw: ActiveWorkout }) {
  const settings = useSettings();
  const fmt = useFormat();
  const workouts = useStore((s) => s.workouts);
  const customExercises = useStore((s) => s.customExercises);
  const editing = !!aw.editingWorkoutId;
  const elapsed = useElapsed(aw.startedAt, !editing);
  const [finishing, setFinishing] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [quickTimer, setQuickTimer] = useState(false);
  const [askUpdateRoutine, setAskUpdateRoutine] = useState(false);

  const lookup = (id: string) => getExercise(id);
  const volume = useMemo(() => workoutVolume(aw, lookup), [aw, customExercises]); // eslint-disable-line react-hooks/exhaustive-deps
  const doneSets = workoutCompletedSets(aw);
  const prs = useMemo(() => workoutPRs(aw, workouts, lookup), [aw, workouts, customExercises]); // eslint-disable-line react-hooks/exhaustive-deps

  const routine = useStore((s) => (aw.routineId ? s.routines.find((r) => r.id === aw.routineId) : undefined));

  const onCompleteSet = (we: WorkoutExercise, _set: SetEntry) => {
    const rest = we.restSec ?? settings.defaultRestSec;
    if (rest > 0 && !editing) startRestTimer(rest);
  };

  const routineChanged = useMemo(() => {
    if (!routine) return false;
    const norm = (list: WorkoutExercise[]) =>
      JSON.stringify(list.map((we) => [we.exerciseId, we.sets.length, we.supersetId ? 1 : 0, we.restSec]));
    return norm(routine.exercises) !== norm(aw.exercises);
  }, [routine, aw.exercises]);

  const doFinish = () => {
    const saved = finishActive();
    if (!saved) return;
    if (editing) {
      toast("Workout updated");
    } else {
      setTab("home");
      push({ type: "workoutComplete", id: saved.id });
    }
  };

  const onFinishPressed = () => {
    if (doneSets === 0) {
      setFinishing(true);
      return;
    }
    if (!editing && routine && routineChanged) {
      setAskUpdateRoutine(true);
      return;
    }
    doFinish();
  };

  return (
    <div className="fullscreen">
      <div className="screen no-tabs" style={{ paddingBottom: aw.restTimer ? 140 : undefined }}>
        <TopBar
          bordered
          left={
            <button className="iconbtn" aria-label="Minimize" onClick={() => setActiveMinimized(true)}>
              <IChevronDown />
            </button>
          }
          title={editing ? "Edit Workout" : "Log Workout"}
          right={
            <>
              {!editing && (
                <button className="iconbtn accent" aria-label="Rest timer" onClick={() => setQuickTimer(true)}>
                  <ITimer />
                </button>
              )}
              <button className="btn primary sm" onClick={onFinishPressed}>
                {editing ? "Save" : "Finish"}
              </button>
            </>
          }
        />

        <div className="content">
          <input
            className="title-input"
            value={aw.title}
            onChange={(e) => updateActive((a) => ({ ...a, title: e.target.value }))}
            placeholder="Workout title"
          />
          <textarea
            className="notes-input"
            rows={1}
            placeholder="Add a description..."
            value={aw.description}
            onChange={(e) => updateActive((a) => ({ ...a, description: e.target.value }))}
          />
          {editing ? (
            <div className="tiny muted" style={{ marginTop: 6 }}>
              {fmtDateLong(aw.startedAt)} · {fmtTime(aw.startedAt)}
            </div>
          ) : null}
          <div className="stats-row" style={{ marginTop: 10 }}>
            <div className="stat">
              <span className="label">Duration</span>
              <span className={`value${editing ? "" : " accent"}`}>{editing ? "—" : fmtClock(elapsed)}</span>
            </div>
            <div className="stat">
              <span className="label">Volume</span>
              <span className="value">{fmt.volume(volume)}</span>
            </div>
            <div className="stat">
              <span className="label">Sets</span>
              <span className="value">{doneSets}</span>
            </div>
            {prs.size > 0 && (
              <div className="stat">
                <span className="label">Records</span>
                <span className="value" style={{ color: "var(--yellow)" }}>
                  🏆 {prs.size}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="divider" style={{ margin: "4px 0 0" }} />

        {aw.exercises.length === 0 && (
          <div className="empty" style={{ paddingBottom: 0 }}>
            <div className="icon">🏋️</div>
            <h3>Get started</h3>
            <p>Add an exercise to start your workout</p>
          </div>
        )}

        <ExerciseEditor
          mode="workout"
          exercises={aw.exercises}
          onChange={(exercises) => updateActive((a) => ({ ...a, exercises }))}
          beforeTs={aw.startedAt}
          onCompleteSet={onCompleteSet}
          prs={prs}
        />

        <div className="content stack" style={{ marginTop: 8 }}>
          <button className="btn danger" onClick={() => setDiscarding(true)}>
            {editing ? "Cancel Edit" : "Discard Workout"}
          </button>
        </div>
      </div>

      <RestTimerBar />

      <Dialog
        open={finishing}
        onClose={() => setFinishing(false)}
        title="No completed sets"
        message={editing ? "Save this workout with no sets? It will be removed from your history." : "Finish the workout with no completed sets? Nothing will be saved."}
      >
        <button
          className="btn danger"
          onClick={() => {
            setFinishing(false);
            if (editing) {
              doFinish();
            } else {
              discardActive();
              toast("Workout discarded");
            }
          }}
        >
          {editing ? "Save anyway" : "Discard workout"}
        </button>
        <button className="btn" onClick={() => setFinishing(false)}>
          Keep going
        </button>
      </Dialog>

      <Confirm
        open={discarding}
        onClose={() => setDiscarding(false)}
        title={editing ? "Cancel editing?" : "Discard workout?"}
        message={editing ? "Your changes will not be saved." : "All progress in this workout will be lost."}
        confirmLabel={editing ? "Discard changes" : "Discard workout"}
        danger
        onConfirm={() => {
          discardActive();
        }}
      />

      <Dialog
        open={askUpdateRoutine}
        onClose={() => setAskUpdateRoutine(false)}
        title="Update routine?"
        message={`You changed the exercises or sets. Update "${routine?.title}" to match this workout?`}
      >
        <button
          className="btn primary"
          onClick={() => {
            updateRoutineFromActive();
            setAskUpdateRoutine(false);
            doFinish();
          }}
        >
          Update routine
        </button>
        <button
          className="btn"
          onClick={() => {
            setAskUpdateRoutine(false);
            doFinish();
          }}
        >
          Keep original routine
        </button>
      </Dialog>

      <Sheet open={quickTimer} onClose={() => setQuickTimer(false)} title="Rest Timer">
        <div className="tiny muted center" style={{ marginBottom: 8 }}>
          Start a rest timer now
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {REST_OPTIONS.filter((s) => s > 0).map((sec) => (
            <button
              key={sec}
              className="btn"
              onClick={() => {
                startRestTimer(sec);
                setQuickTimer(false);
              }}
            >
              {fmtDuration(sec)}
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
