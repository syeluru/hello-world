"use client";

import { useMemo, useState } from "react";
import { push } from "@/lib/nav";
import { useSettings, useStore } from "@/lib/store";
import { dateKey, fmtDuration, fmtTime } from "@/lib/util";
import { workoutDurationSec } from "@/lib/stats";
import { IBack, IChevronRight } from "./Icons";
import { TopBar } from "./ui";

export function CalendarScreen() {
  const workouts = useStore((s) => s.workouts);
  const settings = useSettings();
  const today = new Date();
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string>(dateKey(today));

  const byDay = useMemo(() => {
    const m = new Map<string, typeof workouts>();
    for (const w of workouts) {
      const k = dateKey(w.startedAt);
      m.set(k, [...(m.get(k) ?? []), w]);
    }
    return m;
  }, [workouts]);

  const cells = useMemo(() => {
    const first = new Date(month);
    const offset = (first.getDay() - settings.firstWeekday + 7) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - offset);
    const out: { date: Date; key: string; inMonth: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      out.push({ date: d, key: dateKey(d), inMonth: d.getMonth() === month.getMonth() });
    }
    return out;
  }, [month, settings.firstWeekday]);

  const dows = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const orderedDows = [...dows.slice(settings.firstWeekday), ...dows.slice(0, settings.firstWeekday)];
  const monthWorkouts = workouts.filter((w) => {
    const d = new Date(w.startedAt);
    return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
  }).length;
  const selectedList = (byDay.get(selected) ?? []).sort((a, b) => a.startedAt - b.startedAt);

  return (
    <div className="screen">
      <TopBar onBack title="Calendar" />
      <div className="content">
        <div className="row-between" style={{ marginBottom: 8 }}>
          <button className="iconbtn" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month">
            <IBack />
          </button>
          <div className="center">
            <div className="bold" style={{ fontSize: 17 }}>
              {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </div>
            <div className="tiny muted">
              {monthWorkouts} workout{monthWorkouts === 1 ? "" : "s"}
            </div>
          </div>
          <button className="iconbtn" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month">
            <IChevronRight />
          </button>
        </div>
        <div className="cal-grid">
          {orderedDows.map((d) => (
            <div key={d} className="dow">
              {d}
            </div>
          ))}
          {cells.map((c) => {
            const has = byDay.has(c.key);
            const cls = ["cal-day", c.inMonth ? "" : "other", has ? "has" : "", c.key === dateKey(today) ? "today" : "", c.key === selected ? "selected" : ""]
              .filter(Boolean)
              .join(" ");
            return (
              <button key={c.key} className={cls} onClick={() => setSelected(c.key)}>
                {c.date.getDate()}
              </button>
            );
          })}
        </div>

        <div className="section-title">
          {new Date(selected + "T00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
        </div>
        {selectedList.length === 0 && <div className="muted small" style={{ padding: "0 4px" }}>No workouts on this day.</div>}
        {selectedList.map((w) => (
          <button key={w.id} className="card clickable" style={{ width: "100%", textAlign: "left", marginBottom: 10 }} onClick={() => push({ type: "workoutDetail", id: w.id })}>
            <div className="bold">{w.title}</div>
            <div className="small muted">
              {fmtTime(w.startedAt)} · {fmtDuration(workoutDurationSec(w))} · {w.exercises.length} exercise{w.exercises.length === 1 ? "" : "s"}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
