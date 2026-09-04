"use client";

import { useSyncExternalStore } from "react";
import type { AppData, Settings } from "./types";

export const STORAGE_KEY = "hevyclone:v1";

export const DEFAULT_SETTINGS: Settings = {
  name: "You",
  weightUnit: "kg",
  distanceUnit: "km",
  theme: "dark",
  defaultRestSec: 90,
  firstWeekday: 1,
  restTimerSound: true,
  keepScreenOn: false,
  showPreviousInWorkout: true,
};

export function emptyData(): AppData {
  return {
    version: 1,
    customExercises: [],
    workouts: [],
    routines: [],
    folders: [],
    measurements: [],
    settings: { ...DEFAULT_SETTINGS },
    activeWorkout: null,
    updatedAt: 0,
  };
}

/** Fill in any missing fields from an older / partial document. */
export function normalize(input: unknown): AppData {
  const base = emptyData();
  if (!input || typeof input !== "object") return base;
  const d = input as Partial<AppData>;
  return {
    version: 1,
    customExercises: Array.isArray(d.customExercises) ? d.customExercises : [],
    workouts: Array.isArray(d.workouts) ? d.workouts : [],
    routines: Array.isArray(d.routines) ? d.routines : [],
    folders: Array.isArray(d.folders) ? d.folders : [],
    measurements: Array.isArray(d.measurements) ? d.measurements : [],
    settings: { ...DEFAULT_SETTINGS, ...(d.settings ?? {}) },
    activeWorkout: d.activeWorkout ?? null,
    updatedAt: typeof d.updatedAt === "number" ? d.updatedAt : 0,
  };
}

let state: AppData = emptyData();
let hydrated = false;
const listeners = new Set<() => void>();
const serverSnapshot = emptyData();

function emit() {
  for (const l of listeners) l();
}

export function getState(): AppData {
  return state;
}

export function isHydrated(): boolean {
  return hydrated;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Failed to save", e);
    }
  }, 150);
}

/** Replace state (touches updatedAt) and persist. */
export function setState(updater: (s: AppData) => AppData): void {
  const next = updater(state);
  if (next === state) return;
  state = { ...next, updatedAt: Date.now() };
  emit();
  scheduleSave();
}

/** Replace state with an externally-sourced document without bumping updatedAt. */
export function replaceState(doc: AppData, persist = true): void {
  state = doc;
  emit();
  if (persist) scheduleSave();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Load from localStorage. Safe to call multiple times. */
export function hydrate(): void {
  if (hydrated || typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = normalize(JSON.parse(raw));
  } catch (e) {
    console.warn("Failed to load saved data", e);
  }
  hydrated = true;
  emit();
}

export function useStore<T>(selector: (s: AppData) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(serverSnapshot)
  );
}

export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => hydrated,
    () => false
  );
}

export function useSettings(): Settings {
  return useStore((s) => s.settings);
}

// Cross-tab sync: another tab saved → reload it here.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try {
      const doc = normalize(JSON.parse(e.newValue));
      if (doc.updatedAt > state.updatedAt) replaceState(doc, false);
    } catch {
      /* ignore */
    }
  });
}
