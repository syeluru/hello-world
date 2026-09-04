"use client";

import { useEffect } from "react";
import { setActiveMinimized } from "@/lib/actions";
import { useNav, setTab, type Screen } from "@/lib/nav";
import { hydrate, useHydrated, useSettings, useStore } from "@/lib/store";
import { startSync } from "@/lib/sync";
import { fmtClock } from "@/lib/util";
import { ActiveWorkoutScreen } from "./ActiveWorkoutScreen";
import { CalendarScreen } from "./CalendarScreen";
import { ExerciseDetail } from "./ExerciseDetail";
import { ExercisesScreen } from "./ExercisesScreen";
import { ExploreRoutines } from "./ExploreRoutines";
import { HomeTab } from "./HomeTab";
import { IChevronUp, IDumbbell, IHome, IUser } from "./Icons";
import { MeasuresScreen } from "./MeasuresScreen";
import { ProfileTab } from "./ProfileTab";
import { RoutineEditor } from "./RoutineEditor";
import { SettingsScreen } from "./SettingsScreen";
import { StatisticsScreen } from "./StatisticsScreen";
import { ToastHost } from "./ui";
import { WorkoutComplete } from "./WorkoutComplete";
import { WorkoutDetail } from "./WorkoutDetail";
import { WorkoutTab } from "./WorkoutTab";
import { useState } from "react";

function renderScreen(s: Screen) {
  switch (s.type) {
    case "workoutDetail":
      return <WorkoutDetail id={s.id} />;
    case "exerciseDetail":
      return <ExerciseDetail id={s.id} />;
    case "exercises":
      return <ExercisesScreen />;
    case "routineEditor":
      return <RoutineEditor id={s.id} folderId={s.folderId} />;
    case "statistics":
      return <StatisticsScreen />;
    case "calendar":
      return <CalendarScreen />;
    case "measures":
      return <MeasuresScreen />;
    case "settings":
      return <SettingsScreen />;
    case "workoutComplete":
      return <WorkoutComplete id={s.id} />;
    case "exploreRoutines":
      return <ExploreRoutines />;
  }
}

function ActiveBanner() {
  const aw = useStore((s) => s.activeWorkout);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!aw?.minimized) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [aw?.minimized]);
  if (!aw || !aw.minimized) return null;
  const done = aw.exercises.reduce((a, e) => a + e.sets.filter((s) => s.completed).length, 0);
  return (
    <button className="active-banner" onClick={() => setActiveMinimized(false)}>
      <IChevronUp />
      <div className="grow" style={{ textAlign: "left" }}>
        <div className="bold ellipsis">{aw.editingWorkoutId ? "Editing: " : ""}{aw.title}</div>
        <div className="tiny muted">
          {aw.editingWorkoutId ? "Tap to continue" : `${fmtClock(Math.floor((now - aw.startedAt) / 1000))} · ${done} sets done`}
        </div>
      </div>
      <span className="btn primary xs">Resume</span>
    </button>
  );
}

function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let lock: { release: () => Promise<void> } | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        lock = await (navigator as unknown as { wakeLock: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock.request("screen");
        if (cancelled) await lock.release();
      } catch {
        /* denied */
      }
    };
    void request();
    const onVis = () => document.visibilityState === "visible" && void request();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      void lock?.release();
    };
  }, [enabled]);
}

export default function App() {
  const hydrated = useHydrated();
  const nav = useNav();
  const settings = useSettings();
  const aw = useStore((s) => s.activeWorkout);

  useEffect(() => {
    hydrate();
    startSync();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", settings.theme === "dark" ? "#000000" : "#f2f2f7");
  }, [settings.theme]);

  useWakeLock(settings.keepScreenOn && !!aw && !aw.minimized);

  if (!hydrated) {
    return (
      <div className="app">
        <div className="splash">Loading…</div>
      </div>
    );
  }

  const stack = nav.stacks[nav.tab];
  const top = stack[stack.length - 1];
  const showActive = aw && !aw.minimized;

  return (
    <div className="app">
      {top ? renderScreen(top) : nav.tab === "home" ? <HomeTab /> : nav.tab === "workout" ? <WorkoutTab /> : <ProfileTab />}

      {!(top && top.type === "routineEditor") && !(top && top.type === "workoutComplete") && (
        <>
          <ActiveBanner />
          <nav className="tabbar">
            <button className={nav.tab === "home" ? "active" : ""} onClick={() => setTab("home")}>
              <IHome />
              Home
            </button>
            <button className={nav.tab === "workout" ? "active" : ""} onClick={() => setTab("workout")}>
              <IDumbbell />
              Workout
            </button>
            <button className={nav.tab === "profile" ? "active" : ""} onClick={() => setTab("profile")}>
              <IUser />
              Profile
            </button>
          </nav>
        </>
      )}

      {showActive && <ActiveWorkoutScreen aw={aw} />}
      <ToastHost />
    </div>
  );
}
