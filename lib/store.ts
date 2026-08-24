"use client";

import { getSupabase, supabaseConfigured } from "./supabaseClient";
import type { MealItem, MealLog, WorkoutLog } from "./types";

// Data layer: uses Supabase when configured, otherwise falls back to
// localStorage ("demo mode") so the app is usable before any setup.

export const usingSupabase = supabaseConfigured;

const LS_WORKOUTS = "fnt_workouts";
const LS_MEALS = "fnt_meals";

function lsRead<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
}

function lsWrite<T>(key: string, rows: T[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(rows));
  } catch {
    // storage unavailable (private mode etc.) — demo mode just won't persist
  }
}

function uid(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

// ---------- Workouts ----------

export async function listWorkouts(limit = 14): Promise<WorkoutLog[]> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("workouts")
      .select("id, workout_date, muscle_groups, notes")
      .order("workout_date", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []) as WorkoutLog[];
  }
  return lsRead<WorkoutLog>(LS_WORKOUTS)
    .sort((a, b) => b.workout_date.localeCompare(a.workout_date))
    .slice(0, limit);
}

export async function getWorkout(date: string): Promise<WorkoutLog | null> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("workouts")
      .select("id, workout_date, muscle_groups, notes")
      .eq("workout_date", date)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as WorkoutLog) ?? null;
  }
  return (
    lsRead<WorkoutLog>(LS_WORKOUTS).find((w) => w.workout_date === date) ?? null
  );
}

export async function upsertWorkout(
  date: string,
  muscleGroups: string[],
  notes: string,
): Promise<WorkoutLog> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("workouts")
      .upsert(
        {
          workout_date: date,
          muscle_groups: muscleGroups,
          notes: notes || null,
        },
        { onConflict: "workout_date" },
      )
      .select("id, workout_date, muscle_groups, notes")
      .single();
    if (error) throw new Error(error.message);
    return data as WorkoutLog;
  }
  const rows = lsRead<WorkoutLog>(LS_WORKOUTS);
  const existing = rows.find((w) => w.workout_date === date);
  const row: WorkoutLog = {
    id: existing?.id ?? uid(),
    workout_date: date,
    muscle_groups: muscleGroups,
    notes: notes || null,
  };
  lsWrite(
    LS_WORKOUTS,
    [...rows.filter((w) => w.workout_date !== date), row],
  );
  return row;
}

// ---------- Meals ----------

export async function listMeals(limit = 25): Promise<MealLog[]> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("meals")
      .select(
        "id, description, items, calories, protein_g, carbs_g, fat_g, eaten_at",
      )
      .order("eaten_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []) as MealLog[];
  }
  return lsRead<MealLog>(LS_MEALS)
    .sort((a, b) => b.eaten_at.localeCompare(a.eaten_at))
    .slice(0, limit);
}

export async function addMeal(
  description: string,
  items: MealItem[],
  totals: { calories: number; protein_g: number; carbs_g: number; fat_g: number },
): Promise<MealLog> {
  const row = {
    description,
    items,
    calories: totals.calories,
    protein_g: totals.protein_g,
    carbs_g: totals.carbs_g,
    fat_g: totals.fat_g,
    eaten_at: new Date().toISOString(),
  };
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("meals")
      .insert(row)
      .select(
        "id, description, items, calories, protein_g, carbs_g, fat_g, eaten_at",
      )
      .single();
    if (error) throw new Error(error.message);
    return data as MealLog;
  }
  const withId: MealLog = { id: uid(), ...row };
  lsWrite(LS_MEALS, [withId, ...lsRead<MealLog>(LS_MEALS)]);
  return withId;
}

export async function deleteMeal(id: string): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from("meals").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }
  lsWrite(
    LS_MEALS,
    lsRead<MealLog>(LS_MEALS).filter((m) => m.id !== id),
  );
}

export function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
