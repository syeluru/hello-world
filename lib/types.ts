// Core data model for the workout tracker. All weights are stored in kg and
// all distances in metres; the UI converts to the user's preferred units.

export type WeightUnit = "kg" | "lb";
export type DistanceUnit = "km" | "mi";
export type Theme = "dark" | "light";

export type MuscleGroup =
  | "abdominals"
  | "abductors"
  | "adductors"
  | "biceps"
  | "calves"
  | "cardio"
  | "chest"
  | "forearms"
  | "full_body"
  | "glutes"
  | "hamstrings"
  | "lats"
  | "lower_back"
  | "neck"
  | "quadriceps"
  | "shoulders"
  | "traps"
  | "triceps"
  | "upper_back"
  | "other";

export type Equipment =
  | "none"
  | "barbell"
  | "dumbbell"
  | "kettlebell"
  | "machine"
  | "cable"
  | "plate"
  | "resistance_band"
  | "suspension"
  | "smith_machine"
  | "other";

/** How a set for this exercise is measured. */
export type ExerciseType =
  | "weight_reps" // e.g. bench press: kg x reps
  | "reps_only" // e.g. push-ups: reps
  | "weighted_bodyweight" // e.g. weighted pull-up: +kg x reps
  | "assisted_bodyweight" // e.g. assisted dip: -kg x reps
  | "duration" // e.g. plank: time
  | "distance_duration" // e.g. running: distance + time
  | "weight_distance"; // e.g. farmer's walk: kg x distance

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  type: ExerciseType;
  custom?: boolean;
  instructions?: string;
}

export type SetType = "normal" | "warmup" | "drop" | "failure";

export interface SetEntry {
  id: string;
  type: SetType;
  weightKg: number | null;
  reps: number | null;
  durationSec: number | null;
  distanceM: number | null;
  rpe: number | null;
  completed: boolean;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  notes: string;
  /** Rest timer in seconds; null = use default; 0 = off. */
  restSec: number | null;
  /** Exercises that share a supersetId are grouped as a superset. */
  supersetId: string | null;
  sets: SetEntry[];
}

export interface Workout {
  id: string;
  title: string;
  description: string;
  startedAt: number; // epoch ms
  endedAt: number; // epoch ms
  exercises: WorkoutExercise[];
  routineId: string | null;
}

export interface Routine {
  id: string;
  title: string;
  notes: string;
  folderId: string | null;
  exercises: WorkoutExercise[];
  createdAt: number;
  updatedAt: number;
}

export interface RoutineFolder {
  id: string;
  name: string;
  collapsed: boolean;
}

export interface Measurement {
  id: string;
  date: string; // YYYY-MM-DD
  weightKg: number | null;
  bodyFatPct: number | null;
  notes: string;
}

export interface RestTimerState {
  endsAt: number;
  totalSec: number;
}

export interface ActiveWorkout {
  id: string;
  title: string;
  description: string;
  startedAt: number;
  exercises: WorkoutExercise[];
  routineId: string | null;
  /** Set when editing a saved workout instead of logging a new one. */
  editingWorkoutId: string | null;
  minimized: boolean;
  restTimer: RestTimerState | null;
}

export interface Settings {
  name: string;
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
  theme: Theme;
  defaultRestSec: number;
  firstWeekday: 0 | 1; // 0 = Sunday, 1 = Monday
  restTimerSound: boolean;
  keepScreenOn: boolean;
  showPreviousInWorkout: boolean;
}

export interface AppData {
  version: 1;
  customExercises: Exercise[];
  workouts: Workout[];
  routines: Routine[];
  folders: RoutineFolder[];
  measurements: Measurement[];
  settings: Settings;
  activeWorkout: ActiveWorkout | null;
  updatedAt: number;
}
