"use client";

import { useMemo } from "react";
import { push } from "@/lib/nav";
import { useSettings, useStore } from "@/lib/store";
import { dateKey, initials, startOfWeek } from "@/lib/util";
import { WeeklyChart } from "./HomeTab";
import { ICalendar, IChart, IChevronRight, IList, IRuler, ISettings } from "./Icons";
import { TopBar } from "./ui";

export function useStreak(): { current: number; weeksActive: number } {
  const workouts = useStore((s) => s.workouts);
  const settings = useSettings();
  return useMemo(() => {
    const weeks = new Set(workouts.map((w) => dateKey(startOfWeek(w.startedAt, settings.firstWeekday))));
    let current = 0;
    const cursor = startOfWeek(Date.now(), settings.firstWeekday);
    // current week counts if it has a workout; otherwise start from last week
    if (!weeks.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 7);
    while (weeks.has(dateKey(cursor))) {
      current++;
      cursor.setDate(cursor.getDate() - 7);
    }
    return { current, weeksActive: weeks.size };
  }, [workouts, settings.firstWeekday]);
}

export function ProfileTab() {
  const settings = useSettings();
  const workouts = useStore((s) => s.workouts);
  const { current } = useStreak();

  const items = [
    { icon: <IChart size={22} />, label: "Statistics", go: () => push({ type: "statistics" }) },
    { icon: <IList size={22} />, label: "Exercises", go: () => push({ type: "exercises" }) },
    { icon: <IRuler size={22} />, label: "Measures", go: () => push({ type: "measures" }) },
    { icon: <ICalendar size={22} />, label: "Calendar", go: () => push({ type: "calendar" }) },
  ];

  return (
    <div className="screen">
      <TopBar
        large
        title="Profile"
        right={
          <button className="iconbtn" onClick={() => push({ type: "settings" })} aria-label="Settings">
            <ISettings />
          </button>
        }
      />
      <div className="content">
        <div className="hstack" style={{ gap: 14, marginBottom: 14 }}>
          <span className="avatar lg">{initials(settings.name)}</span>
          <div className="grow">
            <div className="bold" style={{ fontSize: 20 }}>
              {settings.name}
            </div>
            <div className="small muted">
              {workouts.length} workout{workouts.length === 1 ? "" : "s"}
              {current > 0 && ` · 🔥 ${current} week streak`}
            </div>
          </div>
        </div>

        <WeeklyChart weeks={12} />

        <div className="section-title">Dashboard</div>
        <div className="card" style={{ padding: "4px 8px" }}>
          {items.map((it) => (
            <button key={it.label} className="settings-row" onClick={it.go}>
              <span className="accent" style={{ display: "inline-flex" }}>
                {it.icon}
              </span>
              <span className="grow label">{it.label}</span>
              <IChevronRight size={18} className="muted" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
