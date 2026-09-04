"use client";

import { useEffect, useMemo, useState } from "react";
import { getExercise, newSet } from "@/lib/actions";
import { push } from "@/lib/nav";
import { useSettings, useStore } from "@/lib/store";
import { previousSets, setHasValues, usesDistance, usesDuration, usesReps, usesWeight, type PRKind } from "@/lib/stats";
import type { Exercise, SetEntry, SetType, WorkoutExercise } from "@/lib/types";
import { fmtClock, fmtDuration, fmtNum, kgToUnit, metresToUnit, parseClock, uid, unitToKg, unitToMetres } from "@/lib/util";
import { useFormat } from "@/lib/useFormat";
import { ExercisePicker, ExerciseAvatar } from "./ExercisePicker";
import { IArrows, ICheck, IChevronDown, IChevronUp, ILink, IMore, INote, IPlus, ISwap, ITimer, ITrash, ITrophy } from "./Icons";
import { Confirm, MenuItem, Sheet, toast } from "./ui";

const SUPERSET_COLORS = ["#3b82f6", "#a855f7", "#f59e0b", "#22c55e", "#ec4899", "#14b8a6"];

export const REST_OPTIONS = [0, 30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240, 300];

export interface EditorProps {
  exercises: WorkoutExercise[];
  onChange: (next: WorkoutExercise[]) => void;
  mode: "workout" | "routine";
  /** Only used for "previous" lookups in workout mode. */
  beforeTs?: number;
  onCompleteSet?: (we: WorkoutExercise, set: SetEntry) => void;
  prs?: Map<string, PRKind[]>;
}

export function ExerciseEditor(props: EditorProps) {
  const { exercises, onChange } = props;
  const [picker, setPicker] = useState<{ mode: "add" } | { mode: "replace"; weId: string } | null>(null);
  const [reordering, setReordering] = useState(false);

  const supersetColor = useMemo(() => {
    const ids: string[] = [];
    for (const we of exercises) if (we.supersetId && !ids.includes(we.supersetId)) ids.push(we.supersetId);
    return (id: string) => SUPERSET_COLORS[ids.indexOf(id) % SUPERSET_COLORS.length];
  }, [exercises]);

  const updateWe = (id: string, fn: (we: WorkoutExercise) => WorkoutExercise) =>
    onChange(exercises.map((we) => (we.id === id ? fn(we) : we)));

  const removeWe = (id: string) => {
    const target = exercises.find((w) => w.id === id);
    let next = exercises.filter((we) => we.id !== id);
    if (target?.supersetId) next = cleanupSupersets(next);
    onChange(next);
  };

  return (
    <div>
      {exercises.map((we, idx) => (
        <ExerciseBlock
          key={we.id}
          we={we}
          index={idx}
          all={exercises}
          mode={props.mode}
          beforeTs={props.beforeTs}
          prs={props.prs}
          supersetColor={supersetColor}
          onChange={(fn) => updateWe(we.id, fn)}
          onRemove={() => removeWe(we.id)}
          onReplace={() => setPicker({ mode: "replace", weId: we.id })}
          onReorder={() => setReordering(true)}
          onSuperset={(partnerId) => onChange(joinSuperset(exercises, we.id, partnerId))}
          onLeaveSuperset={() => onChange(cleanupSupersets(exercises.map((x) => (x.id === we.id ? { ...x, supersetId: null } : x))))}
          onCompleteSet={props.onCompleteSet}
        />
      ))}

      <div style={{ padding: "12px 12px 4px" }}>
        <button className="btn soft" onClick={() => setPicker({ mode: "add" })}>
          <IPlus size={18} /> Add Exercise
        </button>
      </div>

      <ExercisePicker
        open={picker?.mode === "add"}
        onClose={() => setPicker(null)}
        onPick={(list) => {
          onChange([
            ...exercises,
            ...list.map((ex) => ({
              id: uid("we"),
              exerciseId: ex.id,
              notes: "",
              restSec: null,
              supersetId: null,
              sets: [newSet(), newSet(), newSet()],
            })),
          ]);
        }}
      />
      <ExercisePicker
        open={picker?.mode === "replace"}
        single
        onClose={() => setPicker(null)}
        onPick={([ex]) => {
          if (!picker || picker.mode !== "replace" || !ex) return;
          updateWe(picker.weId, (we) => ({
            ...we,
            exerciseId: ex.id,
            sets: we.sets.map((s) => newSet({ type: s.type })),
          }));
        }}
      />
      <ReorderSheet open={reordering} onClose={() => setReordering(false)} exercises={exercises} onChange={onChange} />
    </div>
  );
}

function cleanupSupersets(list: WorkoutExercise[]): WorkoutExercise[] {
  const counts = new Map<string, number>();
  for (const we of list) if (we.supersetId) counts.set(we.supersetId, (counts.get(we.supersetId) ?? 0) + 1);
  return list.map((we) => (we.supersetId && (counts.get(we.supersetId) ?? 0) < 2 ? { ...we, supersetId: null } : we));
}

function joinSuperset(list: WorkoutExercise[], aId: string, bId: string): WorkoutExercise[] {
  const a = list.find((x) => x.id === aId);
  const b = list.find((x) => x.id === bId);
  if (!a || !b) return list;
  const groupId = b.supersetId ?? a.supersetId ?? uid("ss");
  return cleanupSupersets(list.map((x) => (x.id === aId || x.id === bId ? { ...x, supersetId: groupId } : x)));
}

function ReorderSheet({
  open,
  onClose,
  exercises,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  exercises: WorkoutExercise[];
  onChange: (n: WorkoutExercise[]) => void;
}) {
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= exercises.length) return;
    const next = [...exercises];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  };
  return (
    <Sheet open={open} onClose={onClose} title="Reorder Exercises">
      {exercises.map((we, i) => {
        const ex = getExercise(we.exerciseId);
        return (
          <div key={we.id} className="list-item">
            <div className="grow name">{ex?.name ?? "Unknown"}</div>
            <button className="iconbtn" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
              <IChevronUp />
            </button>
            <button className="iconbtn" disabled={i === exercises.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
              <IChevronDown />
            </button>
          </div>
        );
      })}
      <button className="btn primary" style={{ marginTop: 8 }} onClick={onClose}>
        Done
      </button>
    </Sheet>
  );
}

// ---------------- single exercise block ----------------

function ExerciseBlock({
  we,
  index,
  all,
  mode,
  beforeTs,
  prs,
  supersetColor,
  onChange,
  onRemove,
  onReplace,
  onReorder,
  onSuperset,
  onLeaveSuperset,
  onCompleteSet,
}: {
  we: WorkoutExercise;
  index: number;
  all: WorkoutExercise[];
  mode: "workout" | "routine";
  beforeTs?: number;
  prs?: Map<string, PRKind[]>;
  supersetColor: (id: string) => string;
  onChange: (fn: (we: WorkoutExercise) => WorkoutExercise) => void;
  onRemove: () => void;
  onReplace: () => void;
  onReorder: () => void;
  onSuperset: (partnerId: string) => void;
  onLeaveSuperset: () => void;
  onCompleteSet?: (we: WorkoutExercise, set: SetEntry) => void;
}) {
  const settings = useSettings();
  const fmt = useFormat();
  const workouts = useStore((s) => s.workouts);
  const customExercises = useStore((s) => s.customExercises);
  const ex = useMemo(() => getExercise(we.exerciseId), [we.exerciseId, customExercises]); // eslint-disable-line react-hooks/exhaustive-deps
  const [menu, setMenu] = useState(false);
  const [showNotes, setShowNotes] = useState(!!we.notes);
  const [restPicker, setRestPicker] = useState(false);
  const [supersetPicker, setSupersetPicker] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [setTypeFor, setSetMenu] = useState<string | null>(null);

  useEffect(() => {
    if (we.notes) setShowNotes(true);
  }, [we.notes]);

  const prev = useMemo(
    () => (mode === "workout" && settings.showPreviousInWorkout ? previousSets(we.exerciseId, workouts, beforeTs ?? Infinity) : null),
    [we.exerciseId, workouts, beforeTs, mode, settings.showPreviousInWorkout]
  );

  if (!ex) {
    return (
      <div className="exercise-block">
        <div className="exercise-head">
          <div className="grow muted">Unknown exercise</div>
          <button className="textbtn danger" onClick={onRemove}>
            Remove
          </button>
        </div>
      </div>
    );
  }

  const restSec = we.restSec ?? settings.defaultRestSec;
  const type = ex.type;
  const cols = {
    weight: usesWeight(type),
    reps: usesReps(type),
    duration: usesDuration(type),
    distance: usesDistance(type),
  };

  const updateSet = (id: string, patch: Partial<SetEntry>) =>
    onChange((w) => ({ ...w, sets: w.sets.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));

  const addSet = () =>
    onChange((w) => {
      const last = w.sets[w.sets.length - 1];
      return {
        ...w,
        sets: [
          ...w.sets,
          newSet(
            last
              ? { weightKg: last.weightKg, reps: last.reps, durationSec: last.durationSec, distanceM: last.distanceM, type: last.type === "warmup" ? "normal" : "normal" }
              : {}
          ),
        ],
      };
    });

  const removeSet = (id: string) => onChange((w) => ({ ...w, sets: w.sets.filter((s) => s.id !== id) }));

  const toggleComplete = (s: SetEntry, prevSet: SetEntry | undefined) => {
    if (s.completed) {
      updateSet(s.id, { completed: false });
      return;
    }
    // Fill blanks from previous / placeholder like Hevy does.
    const filled: SetEntry = {
      ...s,
      weightKg: s.weightKg ?? prevSet?.weightKg ?? null,
      reps: s.reps ?? prevSet?.reps ?? null,
      durationSec: s.durationSec ?? prevSet?.durationSec ?? null,
      distanceM: s.distanceM ?? prevSet?.distanceM ?? null,
    };
    if (!setHasValues(filled, type)) {
      toast(cols.reps ? "Enter reps first" : cols.duration ? "Enter a time first" : "Enter a value first");
      return;
    }
    const done = { ...filled, completed: true };
    updateSet(s.id, done);
    onCompleteSet?.(we, done);
  };

  const weightLabel = type === "weighted_bodyweight" ? `+${fmt.unit}` : type === "assisted_bodyweight" ? `-${fmt.unit}` : fmt.unit;

  // number of "normal" sets before this index, to label set numbers like Hevy (W/D/F don't count)
  const setLabel = (i: number) => {
    const s = we.sets[i]!;
    if (s.type === "warmup") return "W";
    if (s.type === "drop") return "D";
    if (s.type === "failure") return "F";
    let n = 0;
    for (let k = 0; k <= i; k++) if (we.sets[k]!.type === "normal" || we.sets[k]!.type === "failure" || we.sets[k]!.type === "drop") n++;
    return String(n);
  };

  const prevText = (i: number): string | null => {
    const p = prev?.[i];
    if (!p) return null;
    const parts: string[] = [];
    if (cols.weight) parts.push(fmt.weight(p.weightKg ?? 0));
    if (cols.distance) parts.push(fmt.distance(p.distanceM ?? 0));
    if (cols.reps) parts.push(`${p.reps ?? 0}`);
    if (cols.duration) parts.push(fmtClock(p.durationSec ?? 0));
    return parts.join(" × ");
  };

  return (
    <div className="exercise-block">
      <div className="exercise-head">
        <ExerciseAvatar ex={ex} size="sm" />
        <button className="ex-name ellipsis" onClick={() => push({ type: "exerciseDetail", id: ex.id })}>
          {ex.name}
        </button>
        {we.supersetId && (
          <span className="superset-tag" style={{ background: supersetColor(we.supersetId) }}>
            Superset
          </span>
        )}
        <button className="iconbtn accent" onClick={() => setMenu(true)} aria-label="Exercise options">
          <IMore />
        </button>
      </div>

      {showNotes && (
        <div className="exercise-notes">
          <textarea
            className="notes-input"
            rows={1}
            placeholder="Add notes here..."
            value={we.notes}
            onChange={(e) => onChange((w) => ({ ...w, notes: e.target.value }))}
            style={{ background: "var(--input)", padding: "8px 10px", borderRadius: 8, color: "var(--text)" }}
          />
        </div>
      )}

      <button className={`rest-label${restSec === 0 ? " off" : ""}`} onClick={() => setRestPicker(true)}>
        <ITimer size={16} /> Rest Timer: {restSec === 0 ? "OFF" : fmtDuration(restSec)}
      </button>

      <table className="set-table">
        <thead>
          <tr>
            <th className="col-set">Set</th>
            {mode === "workout" && <th className="col-prev">Previous</th>}
            {cols.weight && <th>{weightLabel}</th>}
            {cols.distance && <th>{fmt.distUnit}</th>}
            {cols.reps && <th>Reps</th>}
            {cols.duration && <th>Time</th>}
            {mode === "workout" ? (
              <th className="col-check">
                <ICheck size={16} />
              </th>
            ) : (
              <th className="col-check" />
            )}
          </tr>
        </thead>
        <tbody>
          {we.sets.map((s, i) => {
            const pr = prs?.get(s.id);
            const prevSet = prev?.[i];
            return (
              <tr key={s.id} className={s.completed ? "done" : ""}>
                <td className="col-set">
                  <button className={`set-num ${s.type}`} onClick={() => setSetMenu(s.id)}>
                    {setLabel(i)}
                  </button>
                </td>
                {mode === "workout" && (
                  <td className="col-prev">
                    {prevText(i) ? (
                      <button
                        className="prev-btn"
                        title="Use previous values"
                        onClick={() =>
                          updateSet(s.id, {
                            weightKg: prevSet?.weightKg ?? s.weightKg,
                            reps: prevSet?.reps ?? s.reps,
                            durationSec: prevSet?.durationSec ?? s.durationSec,
                            distanceM: prevSet?.distanceM ?? s.distanceM,
                          })
                        }
                      >
                        {prevText(i)}
                      </button>
                    ) : (
                      <span className="faint">—</span>
                    )}
                    {pr && (
                      <span className="badge pr" title={pr.join(", ")} style={{ marginLeft: 4 }}>
                        <ITrophy size={11} />
                      </span>
                    )}
                  </td>
                )}
                {cols.weight && (
                  <td>
                    <NumInput
                      value={s.weightKg == null ? null : kgToUnit(s.weightKg, fmt.unit)}
                      placeholder={prevSet?.weightKg != null ? fmtNum(kgToUnit(prevSet.weightKg, fmt.unit), 1) : "-"}
                      onCommit={(v) => updateSet(s.id, { weightKg: v == null ? null : unitToKg(v, fmt.unit) })}
                    />
                  </td>
                )}
                {cols.distance && (
                  <td>
                    <NumInput
                      value={s.distanceM == null ? null : metresToUnit(s.distanceM, fmt.distUnit)}
                      placeholder={prevSet?.distanceM != null ? fmtNum(metresToUnit(prevSet.distanceM, fmt.distUnit), 2) : "-"}
                      onCommit={(v) => updateSet(s.id, { distanceM: v == null ? null : unitToMetres(v, fmt.distUnit) })}
                    />
                  </td>
                )}
                {cols.reps && (
                  <td>
                    <NumInput
                      value={s.reps}
                      integer
                      placeholder={prevSet?.reps != null ? String(prevSet.reps) : "-"}
                      onCommit={(v) => updateSet(s.id, { reps: v == null ? null : Math.round(v) })}
                    />
                  </td>
                )}
                {cols.duration && (
                  <td>
                    <ClockInput
                      value={s.durationSec}
                      placeholder={prevSet?.durationSec != null ? fmtClock(prevSet.durationSec) : "0:00"}
                      onCommit={(v) => updateSet(s.id, { durationSec: v })}
                    />
                  </td>
                )}
                <td className="col-check">
                  {mode === "workout" ? (
                    <button className={`check${s.completed ? " on" : ""}`} onClick={() => toggleComplete(s, prevSet)} aria-label="Complete set">
                      <ICheck size={18} />
                    </button>
                  ) : (
                    <button className="check" onClick={() => removeSet(s.id)} aria-label="Remove set" title="Remove set">
                      <ITrash size={16} />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button className="add-set" onClick={addSet}>
        + Add Set
      </button>

      {/* exercise menu */}
      <Sheet open={menu} onClose={() => setMenu(false)}>
        <div className="hstack" style={{ padding: "4px 8px 8px" }}>
          <ExerciseAvatar ex={ex} size="sm" />
          <div className="bold grow">{ex.name}</div>
        </div>
        <MenuItem icon={<INote size={20} />} label={showNotes ? "Hide Note" : "Add Note"} onClick={() => { setShowNotes((v) => !v); setMenu(false); }} />
        <MenuItem icon={<ITimer size={20} />} label="Rest Timer" desc={restSec === 0 ? "Off" : fmtDuration(restSec)} onClick={() => { setMenu(false); setRestPicker(true); }} />
        {we.supersetId ? (
          <MenuItem icon={<ILink size={20} />} label="Remove from Superset" onClick={() => { onLeaveSuperset(); setMenu(false); }} />
        ) : (
          <MenuItem icon={<ILink size={20} />} label="Add to Superset" onClick={() => { setMenu(false); setSupersetPicker(true); }} />
        )}
        <MenuItem icon={<ISwap size={20} />} label="Replace Exercise" onClick={() => { setMenu(false); onReplace(); }} />
        <MenuItem icon={<IArrows size={20} />} label="Reorder Exercises" onClick={() => { setMenu(false); onReorder(); }} />
        <MenuItem icon={<ITrash size={20} />} label="Remove Exercise" danger onClick={() => { setMenu(false); setConfirmRemove(true); }} />
      </Sheet>

      <Confirm
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title="Remove exercise?"
        message={`Remove ${ex.name} and its sets from this ${mode}?`}
        confirmLabel="Remove"
        danger
        onConfirm={onRemove}
      />

      {/* rest timer picker */}
      <Sheet open={restPicker} onClose={() => setRestPicker(false)} title="Rest Timer">
        <div className="tiny muted center" style={{ marginBottom: 8 }}>
          Starts automatically when you complete a set of this exercise.
        </div>
        {REST_OPTIONS.map((sec) => (
          <button
            key={sec}
            className={`list-item${sec === restSec ? " selected" : ""}`}
            onClick={() => {
              onChange((w) => ({ ...w, restSec: sec === settings.defaultRestSec ? null : sec }));
              setRestPicker(false);
            }}
          >
            <span className="grow name">{sec === 0 ? "Off" : fmtDuration(sec)}</span>
            {sec === settings.defaultRestSec && <span className="tiny muted">Default</span>}
            {sec === restSec && (
              <span className="accent">
                <ICheck size={18} />
              </span>
            )}
          </button>
        ))}
      </Sheet>

      {/* superset partner picker */}
      <Sheet open={supersetPicker} onClose={() => setSupersetPicker(false)} title="Superset with…">
        {all.filter((x) => x.id !== we.id).length === 0 && <div className="empty">Add another exercise first.</div>}
        {all
          .filter((x) => x.id !== we.id)
          .map((x) => {
            const xe = getExercise(x.exerciseId);
            return (
              <button
                key={x.id}
                className="list-item"
                onClick={() => {
                  onSuperset(x.id);
                  setSupersetPicker(false);
                }}
              >
                {xe && <ExerciseAvatar ex={xe} size="sm" />}
                <span className="grow name">{xe?.name ?? "Unknown"}</span>
                {x.supersetId && (
                  <span className="superset-tag" style={{ background: supersetColor(x.supersetId) }}>
                    Superset
                  </span>
                )}
              </button>
            );
          })}
      </Sheet>

      {/* set type menu */}
      <SetTypeSheet
        open={!!setTypeFor}
        onClose={() => setSetMenu(null)}
        current={we.sets.find((s) => s.id === setTypeFor)?.type ?? "normal"}
        onPick={(t) => {
          if (setTypeFor) updateSet(setTypeFor, { type: t });
          setSetMenu(null);
        }}
        onRemove={() => {
          if (setTypeFor) removeSet(setTypeFor);
          setSetMenu(null);
        }}
      />
    </div>
  );
}

function SetTypeSheet({
  open,
  onClose,
  current,
  onPick,
  onRemove,
}: {
  open: boolean;
  onClose: () => void;
  current: SetType;
  onPick: (t: SetType) => void;
  onRemove: () => void;
}) {
  const items: { id: SetType; label: string; badge: string; cls: string }[] = [
    { id: "warmup", label: "Warm Up Set", badge: "W", cls: "warmup" },
    { id: "normal", label: "Normal Set", badge: "1", cls: "" },
    { id: "failure", label: "Failure Set", badge: "F", cls: "failure" },
    { id: "drop", label: "Drop Set", badge: "D", cls: "drop" },
  ];
  return (
    <Sheet open={open} onClose={onClose} title="Set Type">
      {items.map((it) => (
        <button key={it.id} className={`list-item${current === it.id ? " selected" : ""}`} onClick={() => onPick(it.id)}>
          <span className={`set-num ${it.cls}`}>{it.badge}</span>
          <span className="grow name">{it.label}</span>
          {current === it.id && (
            <span className="accent">
              <ICheck size={18} />
            </span>
          )}
        </button>
      ))}
      <div className="divider" />
      <button className="list-item" onClick={onRemove}>
        <span className="set-num failure">
          <ITrash size={16} />
        </span>
        <span className="grow name red">Remove Set</span>
      </button>
    </Sheet>
  );
}

// ---------------- inputs ----------------

export function NumInput({
  value,
  onCommit,
  placeholder,
  integer,
}: {
  value: number | null;
  onCommit: (v: number | null) => void;
  placeholder?: string;
  integer?: boolean;
}) {
  const display = value == null ? "" : fmtNum(value, integer ? 0 : 2);
  const [text, setText] = useState(display);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(display);
  }, [display, focused]);
  return (
    <input
      type="text"
      inputMode={integer ? "numeric" : "decimal"}
      value={text}
      placeholder={placeholder}
      onFocus={(e) => {
        setFocused(true);
        e.target.select();
      }}
      onBlur={() => {
        setFocused(false);
        const n = parseFloat(text.replace(",", "."));
        if (text.trim() === "" || !Number.isFinite(n)) {
          onCommit(null);
          setText("");
        } else {
          onCommit(n);
        }
      }}
      onChange={(e) => {
        const t = e.target.value;
        if (!/^[0-9]*[.,]?[0-9]*$/.test(t)) return;
        setText(t);
        const n = parseFloat(t.replace(",", "."));
        if (Number.isFinite(n)) onCommit(n);
        else if (t.trim() === "") onCommit(null);
      }}
    />
  );
}

export function ClockInput({ value, onCommit, placeholder }: { value: number | null; onCommit: (v: number | null) => void; placeholder?: string }) {
  const display = value == null ? "" : fmtClock(value);
  const [text, setText] = useState(display);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(display);
  }, [display, focused]);
  return (
    <input
      type="text"
      inputMode="numeric"
      value={text}
      placeholder={placeholder}
      onFocus={(e) => {
        setFocused(true);
        e.target.select();
      }}
      onChange={(e) => {
        const t = e.target.value;
        if (!/^[0-9:]*$/.test(t)) return;
        setText(t);
        const secs = parseClock(t);
        if (secs != null) onCommit(secs);
        else if (t.trim() === "") onCommit(null);
      }}
      onBlur={() => {
        setFocused(false);
        const secs = parseClock(text);
        onCommit(secs);
        setText(secs == null ? "" : fmtClock(secs));
      }}
    />
  );
}

export function exerciseName(ex: Exercise | undefined): string {
  return ex?.name ?? "Unknown exercise";
}
