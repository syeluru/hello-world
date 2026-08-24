export const MUSCLE_GROUPS = [
  { id: "chest", label: "Chest" },
  { id: "triceps", label: "Triceps" },
  { id: "shoulders", label: "Shoulders" },
  { id: "biceps", label: "Biceps" },
  { id: "back", label: "Back" },
  { id: "abs_core", label: "Abs / Core" },
  { id: "quads", label: "Quads" },
  { id: "hamstrings", label: "Hamstrings" },
  { id: "calves", label: "Calves" },
  { id: "plyometrics", label: "Plyometrics" },
  { id: "flexibility", label: "Flexibility" },
  { id: "recovery", label: "Recovery" },
] as const;

export type MuscleGroupId = (typeof MUSCLE_GROUPS)[number]["id"];

export function muscleLabel(id: string): string {
  return MUSCLE_GROUPS.find((m) => m.id === id)?.label ?? id;
}

export interface WorkoutLog {
  id: string;
  workout_date: string; // YYYY-MM-DD
  muscle_groups: string[];
  notes: string | null;
}

export interface MealItem {
  name: string;
  quantity: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface MealLog {
  id: string;
  description: string;
  items: MealItem[];
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  eaten_at: string; // ISO timestamp
}

export interface ParsedMeal {
  items: MealItem[];
  totals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  note: string;
}

export function todayISODate(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}
