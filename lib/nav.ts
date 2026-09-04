"use client";

import { useSyncExternalStore } from "react";

export type Tab = "home" | "workout" | "profile";

export type Screen =
  | { type: "workoutDetail"; id: string }
  | { type: "exerciseDetail"; id: string }
  | { type: "exercises" }
  | { type: "routineEditor"; id: string | null; folderId?: string | null }
  | { type: "statistics" }
  | { type: "calendar" }
  | { type: "measures" }
  | { type: "settings" }
  | { type: "workoutComplete"; id: string }
  | { type: "exploreRoutines" };

interface NavState {
  tab: Tab;
  stacks: Record<Tab, Screen[]>;
}

let nav: NavState = { tab: "home", stacks: { home: [], workout: [], profile: [] } };
const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}
function set(next: NavState) {
  nav = next;
  emit();
}

export function getNav(): NavState {
  return nav;
}

export function useNav(): NavState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => nav,
    () => nav
  );
}

let depth = 0; // how many history entries we've pushed

export function push(screen: Screen): void {
  const stack = [...nav.stacks[nav.tab], screen];
  set({ ...nav, stacks: { ...nav.stacks, [nav.tab]: stack } });
  if (typeof window !== "undefined") {
    depth++;
    window.history.pushState({ depth }, "");
  }
}

export function pop(): void {
  const stack = nav.stacks[nav.tab];
  if (!stack.length) return;
  set({ ...nav, stacks: { ...nav.stacks, [nav.tab]: stack.slice(0, -1) } });
}

/** Pop via the browser history so back-button state stays in sync. */
export function back(): void {
  if (typeof window !== "undefined" && depth > 0) {
    window.history.back();
  } else {
    pop();
  }
}

/** Replace the top screen (no new history entry). */
export function replace(screen: Screen): void {
  const stack = nav.stacks[nav.tab];
  const next = stack.length ? [...stack.slice(0, -1), screen] : [screen];
  set({ ...nav, stacks: { ...nav.stacks, [nav.tab]: next } });
}

export function popAll(): void {
  set({ ...nav, stacks: { ...nav.stacks, [nav.tab]: [] } });
}

export function setTab(tab: Tab): void {
  if (tab === nav.tab) {
    // tapping the active tab pops to root
    set({ ...nav, stacks: { ...nav.stacks, [tab]: [] } });
    return;
  }
  set({ ...nav, tab });
}

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    if (depth > 0) depth--;
    pop();
  });
}
