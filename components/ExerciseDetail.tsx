"use client";

import { useMemo, useState } from "react";
import { deleteCustomExercise, getExercise, updateCustomExercise } from "@/lib/actions";
import { equipmentLabel, exerciseTypeLabel, muscleLabel } from "@/lib/exercises";
import { back, push } from "@/lib/nav";
import { useStore } from "@/lib/store";
import type { ExerciseType } from "@/lib/types";
import { describeSet, exerciseRecords, oneRepMax, usesReps, usesWeight, workoutPRs } from "@/lib/stats";
import { fmtDate, fmtRelative } from "@/lib/util";
import { useFormat } from "@/lib/useFormat";
import { LineChart } from "./Charts";
import { CreateExerciseSheet, ExerciseAvatar } from "./ExercisePicker";
import { IEdit, IMore, ITrash, ITrophy } from "./Icons";
import { Confirm, MenuItem, Segmented, Sheet, TopBar, toast } from "./ui";

type Tab = "about" | "history" | "charts" | "records";
type ChartKind = "weight" | "1rm" | "setvolume" | "volume" | "reps" | "duration" | "distance";

export function ExerciseDetail({ id }: { id: string }) {
  const customExercises = useStore((s) => s.customExercises);
  const workouts = useStore((s) => s.workouts);
  const ex = useMemo(() => getExercise(id), [id, customExercises]); // eslint-disable-line react-hooks/exhaustive-deps
  const fmt = useFormat();
  const [tab, setTab] = useState<Tab>("about");
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const history = useMemo(
    () =>
      workouts
        .filter((w) => w.exercises.some((we) => we.exerciseId === id))
        .sort((a, b) => b.startedAt - a.startedAt),
    [workouts, id]
  );

  if (!ex) {
    return (
      <div className="screen">
        <TopBar onBack title="Exercise" />
        <div className="empty">Exercise not found.</div>
      </div>
    );
  }

  const records = exerciseRecords(id, ex.type, workouts);
  const hasWR = usesWeight(ex.type) && usesReps(ex.type);
  const setFmt = { weight: (kg: number) => fmt.weight(kg), distance: fmt.distance, clock: fmt.clock };

  return (
    <div className="screen">
      <TopBar
        onBack
        title={ex.name}
        right={
          ex.custom ? (
            <button className="iconbtn" onClick={() => setMenu(true)} aria-label="Options">
              <IMore />
            </button>
          ) : null
        }
      />
      <div className="content">
        <div className="hstack" style={{ marginBottom: 12 }}>
          <ExerciseAvatar ex={ex} />
          <div className="grow">
            <div className="bold" style={{ fontSize: 17 }}>
              {ex.name}
            </div>
            <div className="small muted">
              {muscleLabel(ex.muscleGroup)} · {equipmentLabel(ex.equipment)}
            </div>
          </div>
        </div>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { id: "about", label: "About" },
            { id: "history", label: "History" },
            { id: "charts", label: "Charts" },
            { id: "records", label: "Records" },
          ]}
        />

        {tab === "about" && (
          <div style={{ marginTop: 14 }}>
            <div className="card">
              <div className="tiny muted bold">Primary muscle</div>
              <div>{muscleLabel(ex.muscleGroup)}</div>
              {ex.secondaryMuscles.length > 0 && (
                <>
                  <div className="tiny muted bold" style={{ marginTop: 10 }}>
                    Secondary muscles
                  </div>
                  <div>{ex.secondaryMuscles.map(muscleLabel).join(", ")}</div>
                </>
              )}
              <div className="tiny muted bold" style={{ marginTop: 10 }}>
                Equipment
              </div>
              <div>{equipmentLabel(ex.equipment)}</div>
              <div className="tiny muted bold" style={{ marginTop: 10 }}>
                Type
              </div>
              <div>{exerciseTypeLabel(ex.type)}</div>
              {ex.instructions && (
                <>
                  <div className="tiny muted bold" style={{ marginTop: 10 }}>
                    Instructions
                  </div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{ex.instructions}</div>
                </>
              )}
            </div>
            <div className="card" style={{ marginTop: 10 }}>
              <div className="stats-row">
                <div className="stat">
                  <span className="label">Times performed</span>
                  <span className="value">{history.length}</span>
                </div>
                <div className="stat">
                  <span className="label">Last performed</span>
                  <span className="value">{history[0] ? fmtRelative(history[0].startedAt) : "—"}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "history" && (
          <div style={{ marginTop: 14 }}>
            {history.length === 0 && <div className="empty">No history yet. Log this exercise in a workout to see it here.</div>}
            {history.map((w) => {
              const prs = workoutPRs(w, workouts, (eid) => getExercise(eid));
              let n = 0;
              return (
                <button key={w.id} className="card clickable" style={{ width: "100%", textAlign: "left", marginBottom: 10 }} onClick={() => push({ type: "workoutDetail", id: w.id })}>
                  <div className="row-between">
                    <div className="bold">{w.title}</div>
                    <div className="tiny muted">{fmtDate(w.startedAt, { year: "numeric" })}</div>
                  </div>
                  <table className="set-table" style={{ marginTop: 6 }}>
                    <thead>
                      <tr>
                        <th className="col-set">Set</th>
                        <th style={{ textAlign: "left" }}>Result</th>
                        <th className="col-check" />
                      </tr>
                    </thead>
                    <tbody>
                      {w.exercises
                        .filter((we) => we.exerciseId === id)
                        .flatMap((we) => we.sets)
                        .map((s) => {
                          const label = s.type === "warmup" ? "W" : s.type === "drop" ? "D" : s.type === "failure" ? "F" : String(++n);
                          const pr = prs.get(s.id);
                          return (
                            <tr key={s.id}>
                              <td className="col-set">
                                <span className={`set-num ${s.type}`}>{label}</span>
                              </td>
                              <td style={{ textAlign: "left", fontWeight: 600 }}>{describeSet(s, ex.type, setFmt)}</td>
                              <td className="col-check">
                                {pr && (
                                  <span className="badge pr">
                                    <ITrophy size={11} /> PR
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </button>
              );
            })}
          </div>
        )}

        {tab === "charts" && <ChartsTab id={id} type={ex.type} />}

        {tab === "records" && (
          <div style={{ marginTop: 14 }}>
            {history.length === 0 && <div className="empty">No records yet.</div>}
            {history.length > 0 && (
              <>
                <div className="records-grid">
                  {hasWR && (
                    <>
                      <div className="card">
                        <div className="label">Heaviest weight</div>
                        <div className="value">{fmt.weight(records.bestWeightKg)}</div>
                      </div>
                      <div className="card">
                        <div className="label">Best 1RM (est.)</div>
                        <div className="value">{fmt.weight(records.best1RM)}</div>
                      </div>
                      <div className="card">
                        <div className="label">Best set volume</div>
                        <div className="value">{fmt.volume(records.bestSetVolume)}</div>
                      </div>
                      <div className="card">
                        <div className="label">Best session volume</div>
                        <div className="value">{fmt.volume(records.bestSessionVolume)}</div>
                      </div>
                    </>
                  )}
                  {usesReps(ex.type) && (
                    <div className="card">
                      <div className="label">Most reps in a set</div>
                      <div className="value">{records.bestReps}</div>
                    </div>
                  )}
                  {records.bestDurationSec > 0 && (
                    <div className="card">
                      <div className="label">Longest duration</div>
                      <div className="value">{fmt.clock(records.bestDurationSec)}</div>
                    </div>
                  )}
                  {records.bestDistanceM > 0 && (
                    <div className="card">
                      <div className="label">Longest distance</div>
                      <div className="value">{fmt.distance(records.bestDistanceM)}</div>
                    </div>
                  )}
                </div>
                {hasWR && Object.keys(records.repRecords).length > 0 && (
                  <>
                    <div className="section-title">Rep records</div>
                    <div className="card" style={{ padding: "4px 12px" }}>
                      {Object.entries(records.repRecords)
                        .map(([r, w]) => [Number(r), w] as const)
                        .sort((a, b) => a[0] - b[0])
                        .map(([r, w]) => (
                          <div key={r} className="settings-row">
                            <div className="label">{r} reps</div>
                            <div className="value">
                              {fmt.weight(w)} <span className="tiny faint">· est. 1RM {fmt.weight(oneRepMax(w, r))}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <Sheet open={menu} onClose={() => setMenu(false)}>
        <MenuItem
          icon={<IEdit size={20} />}
          label="Edit Exercise"
          onClick={() => {
            setMenu(false);
            setEditing(true);
          }}
        />
        <MenuItem
          icon={<ITrash size={20} />}
          label="Delete Exercise"
          danger
          onClick={() => {
            setMenu(false);
            setConfirmDelete(true);
          }}
        />
      </Sheet>
      {editing && (
        <CreateExerciseSheet
          open={editing}
          onClose={() => setEditing(false)}
          initial={ex}
          onSave={(patch) => {
            updateCustomExercise(ex.id, patch);
            setEditing(false);
            toast("Exercise updated");
          }}
        />
      )}
      <Confirm
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete exercise?"
        message="Past workouts that used it will show it as unknown."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          deleteCustomExercise(ex.id);
          back();
        }}
      />
    </div>
  );
}

function ChartsTab({ id, type }: { id: string; type: ExerciseType }) {
  const workouts = useStore((s) => s.workouts);
  const fmt = useFormat();
  const hasWR = usesWeight(type) && usesReps(type);
  const options: { id: ChartKind; label: string }[] = hasWR
    ? [
        { id: "weight", label: "Heaviest Weight" },
        { id: "1rm", label: "One Rep Max" },
        { id: "setvolume", label: "Best Set Volume" },
        { id: "volume", label: "Session Volume" },
      ]
    : type === "reps_only"
      ? [{ id: "reps", label: "Most Reps" }]
      : type === "duration"
        ? [{ id: "duration", label: "Longest Duration" }]
        : [
            { id: "distance", label: "Distance" },
            { id: "duration", label: "Duration" },
          ];
  const [kind, setKind] = useState<ChartKind>(options[0]!.id);

  const points = useMemo(() => {
    const rows = workouts
      .filter((w) => w.exercises.some((we) => we.exerciseId === id))
      .sort((a, b) => a.startedAt - b.startedAt)
      .map((w) => {
        const sets = w.exercises.filter((we) => we.exerciseId === id).flatMap((we) => we.sets.filter((s) => s.completed && s.type !== "warmup"));
        let y = 0;
        for (const s of sets) {
          const wt = s.weightKg ?? 0;
          const r = s.reps ?? 0;
          if (kind === "weight") y = Math.max(y, wt);
          else if (kind === "1rm") y = Math.max(y, oneRepMax(wt, r));
          else if (kind === "setvolume") y = Math.max(y, wt * r);
          else if (kind === "volume") y += wt * r;
          else if (kind === "reps") y = Math.max(y, r);
          else if (kind === "duration") y = Math.max(y, s.durationSec ?? 0);
          else if (kind === "distance") y = Math.max(y, s.distanceM ?? 0);
        }
        return { x: w.startedAt, y, label: fmtDate(w.startedAt) };
      })
      .filter((p) => p.y > 0);
    return rows;
  }, [workouts, id, kind]);

  const format = (y: number) =>
    kind === "reps" ? String(Math.round(y)) : kind === "duration" ? fmt.clock(y) : kind === "distance" ? fmt.distance(y) : kind === "volume" || kind === "setvolume" ? fmt.volume(y) : fmt.weight(y);

  return (
    <div style={{ marginTop: 14 }}>
      <div className="pill-row">
        {options.map((o) => (
          <button key={o.id} className={`pill${kind === o.id ? " active" : ""}`} onClick={() => setKind(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
      <div className="card" style={{ marginTop: 10 }}>
        <div className="tiny muted bold" style={{ marginBottom: 6 }}>
          {options.find((o) => o.id === kind)?.label}
          {points.length > 0 && <span className="accent"> · {format(points[points.length - 1]!.y)}</span>}
        </div>
        <LineChart points={points} format={(y) => format(y).replace(/ .*/, "")} />
      </div>
      <div className="tiny faint" style={{ marginTop: 8, textAlign: "center" }}>
        {points.length} session{points.length === 1 ? "" : "s"}
      </div>
    </div>
  );
}
