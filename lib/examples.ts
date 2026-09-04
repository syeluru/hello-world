import { exerciseIdFor } from "./exercises";
import type { SetEntry, WorkoutExercise } from "./types";

export interface ExampleRoutine {
  id: string;
  title: string;
  category: string;
  description: string;
  exercises: { name: string; sets: number; reps?: number; restSec?: number; supersetWith?: string }[];
}

/** Example routines shown under "Explore" like Hevy's sample programs. */
export const EXAMPLE_ROUTINES: ExampleRoutine[] = [
  {
    id: "ex_full_body_a",
    title: "Full Body A",
    category: "Full Body",
    description: "Compound-focused full body session. 3x per week alternating with Full Body B.",
    exercises: [
      { name: "Squat (Barbell)", sets: 3, reps: 5, restSec: 180 },
      { name: "Bench Press (Barbell)", sets: 3, reps: 5, restSec: 180 },
      { name: "Bent Over Row (Barbell)", sets: 3, reps: 8, restSec: 120 },
      { name: "Overhead Press (Dumbbell)", sets: 3, reps: 10 },
      { name: "Plank", sets: 3 },
    ],
  },
  {
    id: "ex_full_body_b",
    title: "Full Body B",
    category: "Full Body",
    description: "Hinge and pull focused full body day.",
    exercises: [
      { name: "Deadlift (Barbell)", sets: 3, reps: 5, restSec: 180 },
      { name: "Incline Bench Press (Dumbbell)", sets: 3, reps: 8, restSec: 120 },
      { name: "Lat Pulldown (Cable)", sets: 3, reps: 10 },
      { name: "Leg Press (Machine)", sets: 3, reps: 12 },
      { name: "Hanging Leg Raise", sets: 3, reps: 12 },
    ],
  },
  {
    id: "ex_push",
    title: "Push",
    category: "Push Pull Legs",
    description: "Chest, shoulders and triceps.",
    exercises: [
      { name: "Bench Press (Barbell)", sets: 4, reps: 6, restSec: 150 },
      { name: "Incline Bench Press (Dumbbell)", sets: 3, reps: 10 },
      { name: "Overhead Press (Barbell)", sets: 3, reps: 8, restSec: 120 },
      { name: "Lateral Raise (Dumbbell)", sets: 4, reps: 15, restSec: 60 },
      { name: "Cable Fly Crossovers", sets: 3, reps: 12, restSec: 60 },
      { name: "Triceps Rope Pushdown", sets: 3, reps: 12, restSec: 60 },
      { name: "Overhead Triceps Extension (Cable)", sets: 3, reps: 12, restSec: 60 },
    ],
  },
  {
    id: "ex_pull",
    title: "Pull",
    category: "Push Pull Legs",
    description: "Back, rear delts and biceps.",
    exercises: [
      { name: "Deadlift (Barbell)", sets: 3, reps: 5, restSec: 180 },
      { name: "Pull Up", sets: 4, reps: 8, restSec: 120 },
      { name: "Seated Cable Row - V Grip (Cable)", sets: 3, reps: 10 },
      { name: "Lat Pulldown (Cable)", sets: 3, reps: 12 },
      { name: "Face Pull", sets: 3, reps: 15, restSec: 60 },
      { name: "Bicep Curl (Barbell)", sets: 3, reps: 10, restSec: 60 },
      { name: "Hammer Curl (Dumbbell)", sets: 3, reps: 12, restSec: 60 },
    ],
  },
  {
    id: "ex_legs",
    title: "Legs",
    category: "Push Pull Legs",
    description: "Quads, hamstrings, glutes and calves.",
    exercises: [
      { name: "Squat (Barbell)", sets: 4, reps: 6, restSec: 180 },
      { name: "Romanian Deadlift (Barbell)", sets: 3, reps: 8, restSec: 120 },
      { name: "Leg Press (Machine)", sets: 3, reps: 12 },
      { name: "Leg Curl (Lying, Machine)", sets: 3, reps: 12 },
      { name: "Leg Extension (Machine)", sets: 3, reps: 15, restSec: 60 },
      { name: "Standing Calf Raise (Machine)", sets: 4, reps: 15, restSec: 60 },
    ],
  },
  {
    id: "ex_upper",
    title: "Upper",
    category: "Upper Lower",
    description: "Upper body strength and hypertrophy.",
    exercises: [
      { name: "Bench Press (Barbell)", sets: 4, reps: 6, restSec: 150 },
      { name: "Bent Over Row (Barbell)", sets: 4, reps: 8, restSec: 120 },
      { name: "Seated Shoulder Press (Dumbbell)", sets: 3, reps: 10 },
      { name: "Lat Pulldown (Cable)", sets: 3, reps: 12 },
      { name: "Bicep Curl (Dumbbell)", sets: 3, reps: 12, restSec: 60, supersetWith: "Triceps Pushdown (Cable)" },
      { name: "Triceps Pushdown (Cable)", sets: 3, reps: 12, restSec: 60 },
    ],
  },
  {
    id: "ex_lower",
    title: "Lower",
    category: "Upper Lower",
    description: "Lower body strength and hypertrophy.",
    exercises: [
      { name: "Squat (Barbell)", sets: 4, reps: 6, restSec: 180 },
      { name: "Romanian Deadlift (Barbell)", sets: 3, reps: 8, restSec: 120 },
      { name: "Bulgarian Split Squat", sets: 3, reps: 10 },
      { name: "Leg Curl (Seated, Machine)", sets: 3, reps: 12 },
      { name: "Hip Thrust (Barbell)", sets: 3, reps: 10 },
      { name: "Seated Calf Raise (Machine)", sets: 4, reps: 15, restSec: 60 },
    ],
  },
  {
    id: "ex_bodyweight",
    title: "Bodyweight Basics",
    category: "Home",
    description: "No equipment needed.",
    exercises: [
      { name: "Push Up", sets: 4, reps: 15, restSec: 60 },
      { name: "Squat (Bodyweight)", sets: 4, reps: 20, restSec: 60 },
      { name: "Lunge (Bodyweight)", sets: 3, reps: 12 },
      { name: "Inverted Row", sets: 3, reps: 10 },
      { name: "Glute Bridge", sets: 3, reps: 15 },
      { name: "Plank", sets: 3 },
      { name: "Mountain Climber", sets: 3, reps: 30 },
    ],
  },
  {
    id: "ex_dumbbell",
    title: "Dumbbell Only Full Body",
    category: "Home",
    description: "A full body workout with just a pair of dumbbells.",
    exercises: [
      { name: "Goblet Squat", sets: 3, reps: 12 },
      { name: "Bench Press (Dumbbell)", sets: 3, reps: 10 },
      { name: "Dumbbell Row", sets: 3, reps: 10 },
      { name: "Romanian Deadlift (Dumbbell)", sets: 3, reps: 12 },
      { name: "Seated Shoulder Press (Dumbbell)", sets: 3, reps: 10 },
      { name: "Bicep Curl (Dumbbell)", sets: 3, reps: 12, restSec: 60 },
      { name: "Triceps Extension (Dumbbell)", sets: 3, reps: 12, restSec: 60 },
    ],
  },
  {
    id: "ex_arms",
    title: "Arms & Abs",
    category: "Split",
    description: "Biceps, triceps and core.",
    exercises: [
      { name: "EZ Bar Curl", sets: 4, reps: 10, restSec: 60 },
      { name: "Skullcrusher (Barbell)", sets: 4, reps: 10, restSec: 60 },
      { name: "Incline Curl (Dumbbell)", sets: 3, reps: 12, restSec: 60 },
      { name: "Overhead Triceps Extension (Dumbbell)", sets: 3, reps: 12, restSec: 60 },
      { name: "Hammer Curl (Cable)", sets: 3, reps: 12, restSec: 45 },
      { name: "Cable Crunch", sets: 3, reps: 15, restSec: 45 },
      { name: "Hanging Knee Raise", sets: 3, reps: 12, restSec: 45 },
    ],
  },
];

let counter = 0;
function id(p: string) {
  return `${p}_${Date.now().toString(36)}_${(counter++).toString(36)}`;
}

export function exampleToExercises(r: ExampleRoutine): WorkoutExercise[] {
  const supersets = new Map<string, string>();
  return r.exercises.map((e) => {
    let supersetId: string | null = null;
    if (e.supersetWith) {
      supersetId = id("ss");
      supersets.set(e.supersetWith, supersetId);
    } else if (supersets.has(e.name)) {
      supersetId = supersets.get(e.name)!;
    }
    const sets: SetEntry[] = Array.from({ length: e.sets }, () => ({
      id: id("set"),
      type: "normal",
      weightKg: null,
      reps: e.reps ?? null,
      durationSec: null,
      distanceM: null,
      rpe: null,
      completed: false,
    }));
    return { id: id("we"), exerciseId: exerciseIdFor(e.name), notes: "", restSec: e.restSec ?? null, supersetId, sets };
  });
}
