import type { Exercise, ExerciseType, SetEntry, Workout, WorkoutExercise } from "./types";

/** Epley one-rep-max estimate. */
export function oneRepMax(weightKg: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

export function usesWeight(type: ExerciseType): boolean {
  return type === "weight_reps" || type === "weighted_bodyweight" || type === "assisted_bodyweight" || type === "weight_distance";
}
export function usesReps(type: ExerciseType): boolean {
  return type === "weight_reps" || type === "reps_only" || type === "weighted_bodyweight" || type === "assisted_bodyweight";
}
export function usesDuration(type: ExerciseType): boolean {
  return type === "duration" || type === "distance_duration";
}
export function usesDistance(type: ExerciseType): boolean {
  return type === "distance_duration" || type === "weight_distance";
}

/** Whether a set has enough data to count as "done-able". */
export function setHasValues(set: SetEntry, type: ExerciseType): boolean {
  switch (type) {
    case "weight_reps":
    case "weighted_bodyweight":
    case "assisted_bodyweight":
      return set.reps != null && set.reps > 0;
    case "reps_only":
      return set.reps != null && set.reps > 0;
    case "duration":
      return set.durationSec != null && set.durationSec > 0;
    case "distance_duration":
      return (set.distanceM != null && set.distanceM > 0) || (set.durationSec != null && set.durationSec > 0);
    case "weight_distance":
      return set.distanceM != null && set.distanceM > 0;
  }
}

/** Volume (kg) contributed by a set. Warm-up sets don't count. */
export function setVolume(set: SetEntry, type: ExerciseType): number {
  if (!set.completed || set.type === "warmup") return 0;
  if (type === "weight_reps" || type === "weighted_bodyweight") {
    return (set.weightKg ?? 0) * (set.reps ?? 0);
  }
  return 0;
}

export function workoutVolume(w: { exercises: WorkoutExercise[] }, lookup: (id: string) => Exercise | undefined): number {
  let total = 0;
  for (const we of w.exercises) {
    const ex = lookup(we.exerciseId);
    if (!ex) continue;
    for (const s of we.sets) total += setVolume(s, ex.type);
  }
  return total;
}

export function workoutCompletedSets(w: { exercises: WorkoutExercise[] }): number {
  let n = 0;
  for (const we of w.exercises) for (const s of we.sets) if (s.completed) n++;
  return n;
}

export function workoutTotalReps(w: { exercises: WorkoutExercise[] }): number {
  let n = 0;
  for (const we of w.exercises) for (const s of we.sets) if (s.completed) n += s.reps ?? 0;
  return n;
}

export function workoutDurationSec(w: Workout): number {
  return Math.max(0, Math.round((w.endedAt - w.startedAt) / 1000));
}

export interface ExerciseRecords {
  bestWeightKg: number; // heaviest weight lifted
  best1RM: number;
  bestSetVolume: number; // weight*reps for a single set
  bestSessionVolume: number;
  bestReps: number;
  bestDurationSec: number;
  bestDistanceM: number;
  /** For each rep count, the heaviest weight achieved. */
  repRecords: Record<number, number>;
}

export function emptyRecords(): ExerciseRecords {
  return {
    bestWeightKg: 0,
    best1RM: 0,
    bestSetVolume: 0,
    bestSessionVolume: 0,
    bestReps: 0,
    bestDurationSec: 0,
    bestDistanceM: 0,
    repRecords: {},
  };
}

/** Fold a workout's sets for an exercise into a running records object (mutates). */
export function foldRecords(rec: ExerciseRecords, we: WorkoutExercise, type: ExerciseType): void {
  let sessionVolume = 0;
  for (const s of we.sets) {
    if (!s.completed || s.type === "warmup") continue;
    const w = s.weightKg ?? 0;
    const r = s.reps ?? 0;
    if (usesWeight(type) && usesReps(type) && r > 0) {
      if (w > rec.bestWeightKg) rec.bestWeightKg = w;
      const orm = oneRepMax(w, r);
      if (orm > rec.best1RM) rec.best1RM = orm;
      const vol = w * r;
      if (vol > rec.bestSetVolume) rec.bestSetVolume = vol;
      sessionVolume += vol;
      if (r <= 30 && w > (rec.repRecords[r] ?? 0)) rec.repRecords[r] = w;
    }
    if (r > rec.bestReps) rec.bestReps = r;
    if ((s.durationSec ?? 0) > rec.bestDurationSec) rec.bestDurationSec = s.durationSec ?? 0;
    if ((s.distanceM ?? 0) > rec.bestDistanceM) rec.bestDistanceM = s.distanceM ?? 0;
  }
  if (sessionVolume > rec.bestSessionVolume) rec.bestSessionVolume = sessionVolume;
}

export type PRKind = "weight" | "1rm" | "volume" | "reps" | "duration" | "distance";

export interface SetPR {
  setId: string;
  kinds: PRKind[];
}

/**
 * Compute which sets in `workout` set a new personal record, given all prior
 * workouts (those that ended before it). Returns a map keyed by set id.
 */
export function workoutPRs(
  workout: { id: string; startedAt: number; exercises: WorkoutExercise[] },
  history: Workout[],
  lookup: (id: string) => Exercise | undefined
): Map<string, PRKind[]> {
  const prior = history
    .filter((w) => w.id !== workout.id && w.startedAt < workout.startedAt)
    .sort((a, b) => a.startedAt - b.startedAt);
  const result = new Map<string, PRKind[]>();
  const cache = new Map<string, ExerciseRecords>();

  const recordsFor = (exerciseId: string, type: ExerciseType): ExerciseRecords => {
    let rec = cache.get(exerciseId);
    if (!rec) {
      rec = emptyRecords();
      for (const w of prior) for (const we of w.exercises) if (we.exerciseId === exerciseId) foldRecords(rec, we, type);
      cache.set(exerciseId, rec);
    }
    return rec;
  };

  for (const we of workout.exercises) {
    const ex = lookup(we.exerciseId);
    if (!ex) continue;
    const rec = recordsFor(we.exerciseId, ex.type);
    // Records improve within the workout too, so fold as we go.
    for (const s of we.sets) {
      if (!s.completed || s.type === "warmup") continue;
      const kinds: PRKind[] = [];
      const w = s.weightKg ?? 0;
      const r = s.reps ?? 0;
      if (usesWeight(ex.type) && usesReps(ex.type) && r > 0 && w > 0) {
        if (w > rec.bestWeightKg) kinds.push("weight");
        if (oneRepMax(w, r) > rec.best1RM) kinds.push("1rm");
        if (w * r > rec.bestSetVolume) kinds.push("volume");
      } else if (ex.type === "reps_only" && r > 0) {
        if (r > rec.bestReps) kinds.push("reps");
      } else if (usesDuration(ex.type) && (s.durationSec ?? 0) > 0 && !usesDistance(ex.type)) {
        if ((s.durationSec ?? 0) > rec.bestDurationSec) kinds.push("duration");
      } else if (usesDistance(ex.type) && (s.distanceM ?? 0) > 0) {
        if ((s.distanceM ?? 0) > rec.bestDistanceM) kinds.push("distance");
      }
      if (kinds.length) result.set(s.id, kinds);
      // fold this single set
      foldRecords(rec, { ...we, sets: [s] }, ex.type);
    }
  }
  return result;
}

export function exerciseRecords(exerciseId: string, type: ExerciseType, history: Workout[]): ExerciseRecords {
  const rec = emptyRecords();
  for (const w of history) for (const we of w.exercises) if (we.exerciseId === exerciseId) foldRecords(rec, we, type);
  return rec;
}

/** "Previous" values for an exercise: last time it was performed, all sets. */
export function previousSets(exerciseId: string, history: Workout[], beforeTs = Infinity): SetEntry[] | null {
  const sorted = history.filter((w) => w.startedAt < beforeTs).sort((a, b) => b.startedAt - a.startedAt);
  for (const w of sorted) {
    const found = w.exercises.filter((we) => we.exerciseId === exerciseId);
    if (found.length) {
      return found.flatMap((we) => we.sets.filter((s) => s.completed));
    }
  }
  return null;
}

/** Summary text for a set, e.g. "60 kg x 8" — used in previews/history. */
export function describeSet(
  s: SetEntry,
  type: ExerciseType,
  fmt: { weight: (kg: number) => string; distance: (m: number) => string; clock: (sec: number) => string }
): string {
  switch (type) {
    case "weight_reps":
      return `${fmt.weight(s.weightKg ?? 0)} × ${s.reps ?? 0}`;
    case "weighted_bodyweight":
      return `+${fmt.weight(s.weightKg ?? 0)} × ${s.reps ?? 0}`;
    case "assisted_bodyweight":
      return `-${fmt.weight(s.weightKg ?? 0)} × ${s.reps ?? 0}`;
    case "reps_only":
      return `${s.reps ?? 0} reps`;
    case "duration":
      return fmt.clock(s.durationSec ?? 0);
    case "distance_duration":
      return `${fmt.distance(s.distanceM ?? 0)} in ${fmt.clock(s.durationSec ?? 0)}`;
    case "weight_distance":
      return `${fmt.weight(s.weightKg ?? 0)} × ${fmt.distance(s.distanceM ?? 0)}`;
  }
}

/** Best set of an exercise within a workout, for the feed card. */
export function bestSet(we: WorkoutExercise, type: ExerciseType): SetEntry | null {
  let best: SetEntry | null = null;
  let bestScore = -1;
  for (const s of we.sets) {
    if (!s.completed) continue;
    let score = 0;
    if (usesWeight(type) && usesReps(type)) score = oneRepMax(s.weightKg ?? 0, s.reps ?? 0);
    else if (type === "reps_only") score = s.reps ?? 0;
    else if (type === "duration") score = s.durationSec ?? 0;
    else if (usesDistance(type)) score = s.distanceM ?? 0;
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return best;
}
