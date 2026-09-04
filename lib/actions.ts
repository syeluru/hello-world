"use client";

import { BUILTIN_BY_ID, BUILTIN_EXERCISES } from "./exercises";
import { emptyData, getState, normalize, replaceState, setState } from "./store";
import type {
  ActiveWorkout,
  AppData,
  Exercise,
  Measurement,
  Routine,
  RoutineFolder,
  SetEntry,
  Settings,
  Workout,
  WorkoutExercise,
} from "./types";
import { timeOfDayTitle, uid } from "./util";

// ---------- exercises ----------

export function getExercise(id: string, s: AppData = getState()): Exercise | undefined {
  return s.customExercises.find((e) => e.id === id) ?? BUILTIN_BY_ID[id];
}

export function allExercises(s: AppData = getState()): Exercise[] {
  return [...s.customExercises, ...BUILTIN_EXERCISES].sort((a, b) => a.name.localeCompare(b.name));
}

export function addCustomExercise(input: Omit<Exercise, "id" | "custom">): Exercise {
  const ex: Exercise = { ...input, id: uid("cx"), custom: true };
  setState((s) => ({ ...s, customExercises: [...s.customExercises, ex] }));
  return ex;
}

export function updateCustomExercise(id: string, patch: Partial<Exercise>): void {
  setState((s) => ({
    ...s,
    customExercises: s.customExercises.map((e) => (e.id === id ? { ...e, ...patch, id, custom: true } : e)),
  }));
}

export function deleteCustomExercise(id: string): void {
  setState((s) => ({ ...s, customExercises: s.customExercises.filter((e) => e.id !== id) }));
}

// ---------- sets / workout exercises ----------

export function newSet(partial: Partial<SetEntry> = {}): SetEntry {
  return {
    id: uid("set"),
    type: "normal",
    weightKg: null,
    reps: null,
    durationSec: null,
    distanceM: null,
    rpe: null,
    completed: false,
    ...partial,
  };
}

export function newWorkoutExercise(exerciseId: string, setCount = 3): WorkoutExercise {
  return {
    id: uid("we"),
    exerciseId,
    notes: "",
    restSec: null,
    supersetId: null,
    sets: Array.from({ length: setCount }, () => newSet()),
  };
}

/** Deep-copy exercises from a routine/workout into a fresh (uncompleted) list. */
export function cloneExercises(list: WorkoutExercise[], keepValues = true): WorkoutExercise[] {
  const supersetMap = new Map<string, string>();
  return list.map((we) => {
    let supersetId: string | null = null;
    if (we.supersetId) {
      supersetId = supersetMap.get(we.supersetId) ?? uid("ss");
      supersetMap.set(we.supersetId, supersetId);
    }
    return {
      ...we,
      id: uid("we"),
      supersetId,
      sets: we.sets.map((s) =>
        newSet(
          keepValues
            ? { type: s.type, weightKg: s.weightKg, reps: s.reps, durationSec: s.durationSec, distanceM: s.distanceM, rpe: s.rpe }
            : { type: s.type }
        )
      ),
    };
  });
}

// ---------- settings ----------

export function updateSettings(patch: Partial<Settings>): void {
  setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
}

// ---------- routines & folders ----------

export function createRoutine(input: { title: string; notes?: string; folderId?: string | null; exercises: WorkoutExercise[] }): Routine {
  const now = Date.now();
  const r: Routine = {
    id: uid("rt"),
    title: input.title.trim() || "New Routine",
    notes: input.notes ?? "",
    folderId: input.folderId ?? null,
    exercises: input.exercises,
    createdAt: now,
    updatedAt: now,
  };
  setState((s) => ({ ...s, routines: [...s.routines, r] }));
  return r;
}

export function updateRoutine(id: string, patch: Partial<Routine>): void {
  setState((s) => ({
    ...s,
    routines: s.routines.map((r) => (r.id === id ? { ...r, ...patch, id, updatedAt: Date.now() } : r)),
  }));
}

export function deleteRoutine(id: string): void {
  setState((s) => ({ ...s, routines: s.routines.filter((r) => r.id !== id) }));
}

export function duplicateRoutine(id: string): Routine | null {
  const r = getState().routines.find((x) => x.id === id);
  if (!r) return null;
  return createRoutine({
    title: `${r.title} (Copy)`,
    notes: r.notes,
    folderId: r.folderId,
    exercises: cloneExercises(r.exercises),
  });
}

export function reorderRoutines(ids: string[]): void {
  setState((s) => {
    const byId = new Map(s.routines.map((r) => [r.id, r]));
    const ordered = ids.map((id) => byId.get(id)).filter((r): r is Routine => !!r);
    const rest = s.routines.filter((r) => !ids.includes(r.id));
    return { ...s, routines: [...ordered, ...rest] };
  });
}

export function createFolder(name: string): RoutineFolder {
  const f: RoutineFolder = { id: uid("fd"), name: name.trim() || "New Folder", collapsed: false };
  setState((s) => ({ ...s, folders: [...s.folders, f] }));
  return f;
}

export function updateFolder(id: string, patch: Partial<RoutineFolder>): void {
  setState((s) => ({ ...s, folders: s.folders.map((f) => (f.id === id ? { ...f, ...patch, id } : f)) }));
}

export function deleteFolder(id: string, deleteRoutines: boolean): void {
  setState((s) => ({
    ...s,
    folders: s.folders.filter((f) => f.id !== id),
    routines: deleteRoutines
      ? s.routines.filter((r) => r.folderId !== id)
      : s.routines.map((r) => (r.folderId === id ? { ...r, folderId: null } : r)),
  }));
}

// ---------- saved workouts ----------

export function updateWorkout(id: string, patch: Partial<Workout>): void {
  setState((s) => ({ ...s, workouts: s.workouts.map((w) => (w.id === id ? { ...w, ...patch, id } : w)) }));
}

export function deleteWorkout(id: string): void {
  setState((s) => ({ ...s, workouts: s.workouts.filter((w) => w.id !== id) }));
}

/** Insert a fully-formed workout (used by import and "save as new"). */
export function addWorkout(w: Workout): void {
  setState((s) => ({ ...s, workouts: [...s.workouts, w] }));
}

// ---------- active workout ----------

export function startEmptyWorkout(): ActiveWorkout {
  const aw: ActiveWorkout = {
    id: uid("wk"),
    title: timeOfDayTitle(),
    description: "",
    startedAt: Date.now(),
    exercises: [],
    routineId: null,
    editingWorkoutId: null,
    minimized: false,
    restTimer: null,
  };
  setState((s) => ({ ...s, activeWorkout: aw }));
  return aw;
}

export function startRoutine(routineId: string): ActiveWorkout | null {
  const r = getState().routines.find((x) => x.id === routineId);
  if (!r) return null;
  const aw: ActiveWorkout = {
    id: uid("wk"),
    title: r.title,
    description: r.notes,
    startedAt: Date.now(),
    exercises: cloneExercises(r.exercises),
    routineId: r.id,
    editingWorkoutId: null,
    minimized: false,
    restTimer: null,
  };
  setState((s) => ({ ...s, activeWorkout: aw }));
  return aw;
}

/** Start an active workout pre-filled from a template (e.g. example routine or a past workout). */
export function startFromExercises(title: string, exercises: WorkoutExercise[], description = ""): ActiveWorkout {
  const aw: ActiveWorkout = {
    id: uid("wk"),
    title,
    description,
    startedAt: Date.now(),
    exercises: cloneExercises(exercises),
    routineId: null,
    editingWorkoutId: null,
    minimized: false,
    restTimer: null,
  };
  setState((s) => ({ ...s, activeWorkout: aw }));
  return aw;
}

/** Open a saved workout for editing in the workout screen. */
export function editWorkout(workoutId: string): ActiveWorkout | null {
  const w = getState().workouts.find((x) => x.id === workoutId);
  if (!w) return null;
  const aw: ActiveWorkout = {
    id: w.id,
    title: w.title,
    description: w.description,
    startedAt: w.startedAt,
    exercises: JSON.parse(JSON.stringify(w.exercises)),
    routineId: w.routineId,
    editingWorkoutId: w.id,
    minimized: false,
    restTimer: null,
  };
  setState((s) => ({ ...s, activeWorkout: aw }));
  return aw;
}

export function updateActive(fn: (aw: ActiveWorkout) => ActiveWorkout): void {
  setState((s) => (s.activeWorkout ? { ...s, activeWorkout: fn(s.activeWorkout) } : s));
}

export function setActiveMinimized(minimized: boolean): void {
  updateActive((aw) => ({ ...aw, minimized }));
}

export function discardActive(): void {
  setState((s) => ({ ...s, activeWorkout: null }));
}

/** Finish: store as a workout (dropping incomplete sets) and clear active. Returns the saved workout. */
export function finishActive(endedAt = Date.now()): Workout | null {
  const s = getState();
  const aw = s.activeWorkout;
  if (!aw) return null;
  const exercises = aw.exercises
    .map((we) => ({ ...we, sets: we.sets.filter((st) => st.completed) }))
    .filter((we) => we.sets.length > 0);
  const editing = aw.editingWorkoutId ? s.workouts.find((w) => w.id === aw.editingWorkoutId) : null;
  const w: Workout = {
    id: aw.editingWorkoutId ?? aw.id,
    title: aw.title.trim() || timeOfDayTitle(aw.startedAt),
    description: aw.description,
    startedAt: aw.startedAt,
    endedAt: editing ? Math.max(editing.endedAt, aw.startedAt + 60_000) : Math.max(endedAt, aw.startedAt + 1000),
    exercises,
    routineId: aw.routineId,
  };
  setState((st) => ({
    ...st,
    activeWorkout: null,
    workouts: editing ? st.workouts.map((x) => (x.id === w.id ? w : x)) : [...st.workouts, w],
  }));
  return w;
}

/** Update the routine an active workout came from with the current exercise list. */
export function updateRoutineFromActive(): void {
  const aw = getState().activeWorkout;
  if (!aw?.routineId) return;
  updateRoutine(aw.routineId, { exercises: cloneExercises(aw.exercises).map((we) => ({ ...we, sets: we.sets.map((s) => ({ ...s, completed: false })) })) });
}

// rest timer

export function startRestTimer(totalSec: number): void {
  updateActive((aw) => ({ ...aw, restTimer: { totalSec, endsAt: Date.now() + totalSec * 1000 } }));
}
export function adjustRestTimer(deltaSec: number): void {
  updateActive((aw) =>
    aw.restTimer
      ? {
          ...aw,
          restTimer: {
            totalSec: Math.max(0, aw.restTimer.totalSec + deltaSec),
            endsAt: Math.max(Date.now(), aw.restTimer.endsAt + deltaSec * 1000),
          },
        }
      : aw
  );
}
export function stopRestTimer(): void {
  updateActive((aw) => (aw.restTimer ? { ...aw, restTimer: null } : aw));
}

// ---------- measurements ----------

export function addMeasurement(m: Omit<Measurement, "id">): void {
  setState((s) => ({ ...s, measurements: [...s.measurements.filter((x) => x.date !== m.date), { ...m, id: uid("ms") }] }));
}
export function deleteMeasurement(id: string): void {
  setState((s) => ({ ...s, measurements: s.measurements.filter((m) => m.id !== id) }));
}

// ---------- data management ----------

export function exportJSON(): string {
  return JSON.stringify(getState(), null, 2);
}

export function importJSON(text: string): { ok: true } | { ok: false; error: string } {
  try {
    const doc = normalize(JSON.parse(text));
    replaceState({ ...doc, updatedAt: Date.now() });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid file" };
  }
}

export function resetAll(): void {
  const settings = getState().settings;
  replaceState({ ...emptyData(), settings, updatedAt: Date.now() });
}
