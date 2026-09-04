"use client";

import { useMemo, useState } from "react";
import { addCustomExercise } from "@/lib/actions";
import { BUILTIN_EXERCISES, EQUIPMENT, MUSCLE_GROUPS, EXERCISE_TYPES, equipmentLabel, muscleLabel } from "@/lib/exercises";
import { useStore } from "@/lib/store";
import type { Equipment, Exercise, ExerciseType, MuscleGroup } from "@/lib/types";
import { initials } from "@/lib/util";
import { ICheck, IClose, ISearch } from "./Icons";
import { Sheet } from "./ui";

export function ExerciseAvatar({ ex, size }: { ex: Exercise; size?: "sm" }) {
  return <span className={`ex-avatar${size ? " " + size : ""}`}>{initials(ex.name)}</span>;
}

export function useExerciseList(query: string, muscle: MuscleGroup | "", equipment: Equipment | "") {
  const custom = useStore((s) => s.customExercises);
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...custom, ...BUILTIN_EXERCISES]
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((e) => {
      if (muscle && e.muscleGroup !== muscle && !e.secondaryMuscles.includes(muscle)) return false;
      if (equipment && e.equipment !== equipment) return false;
      if (q && !e.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [custom, query, muscle, equipment]);
}

export function ExerciseFilters({
  query,
  setQuery,
  muscle,
  setMuscle,
  equipment,
  setEquipment,
}: {
  query: string;
  setQuery: (v: string) => void;
  muscle: MuscleGroup | "";
  setMuscle: (v: MuscleGroup | "") => void;
  equipment: Equipment | "";
  setEquipment: (v: Equipment | "") => void;
}) {
  return (
    <div className="stack">
      <div className="search">
        <ISearch size={18} />
        <input placeholder="Search exercise" value={query} onChange={(e) => setQuery(e.target.value)} />
        {query && (
          <button onClick={() => setQuery("")} aria-label="Clear">
            <IClose size={16} />
          </button>
        )}
      </div>
      <div className="hstack">
        <select
          className="pill grow"
          value={muscle}
          onChange={(e) => setMuscle(e.target.value as MuscleGroup | "")}
          style={{ appearance: "none", border: 0, textAlign: "center" }}
        >
          <option value="">Any Body Part</option>
          {MUSCLE_GROUPS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <select
          className="pill grow"
          value={equipment}
          onChange={(e) => setEquipment(e.target.value as Equipment | "")}
          style={{ appearance: "none", border: 0, textAlign: "center" }}
        >
          <option value="">Any Category</option>
          {EQUIPMENT.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function ExercisePicker({
  open,
  onClose,
  onPick,
  single,
  title,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (exercises: Exercise[]) => void;
  single?: boolean;
  title?: string;
}) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | "">("");
  const [equipment, setEquipment] = useState<Equipment | "">("");
  const [selected, setSelected] = useState<Exercise[]>([]);
  const [creating, setCreating] = useState(false);
  const list = useExerciseList(query, muscle, equipment);

  const close = () => {
    setSelected([]);
    setQuery("");
    onClose();
  };

  const toggle = (ex: Exercise) => {
    if (single) {
      onPick([ex]);
      close();
      return;
    }
    setSelected((s) => (s.some((x) => x.id === ex.id) ? s.filter((x) => x.id !== ex.id) : [...s, ex]));
  };

  return (
    <>
      <Sheet open={open} onClose={close} tall>
        <div className="row-between" style={{ marginBottom: 8 }}>
          <button className="textbtn" onClick={close}>
            Cancel
          </button>
          <div className="bold">{title ?? (single ? "Replace Exercise" : "Add Exercise")}</div>
          <button className="textbtn" onClick={() => setCreating(true)}>
            Create
          </button>
        </div>
        <ExerciseFilters {...{ query, setQuery, muscle, setMuscle, equipment, setEquipment }} />
        <div style={{ flex: 1, overflowY: "auto", marginTop: 8 }}>
          {list.length === 0 && <div className="empty">No exercises match.</div>}
          {list.map((ex) => {
            const isSel = selected.some((x) => x.id === ex.id);
            return (
              <button key={ex.id} className={`list-item${isSel ? " selected" : ""}`} onClick={() => toggle(ex)}>
                <ExerciseAvatar ex={ex} />
                <div className="grow">
                  <div className="name">{ex.name}</div>
                  <div className="sub">
                    {muscleLabel(ex.muscleGroup)}
                    {ex.custom ? " · Custom" : ""}
                  </div>
                </div>
                {isSel && (
                  <span className="accent">
                    <ICheck size={20} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {!single && (
          <div style={{ paddingTop: 10 }}>
            <button
              className="btn primary"
              disabled={!selected.length}
              onClick={() => {
                onPick(selected);
                close();
              }}
            >
              {selected.length ? `Add ${selected.length} exercise${selected.length === 1 ? "" : "s"}` : "Select exercises"}
            </button>
          </div>
        )}
      </Sheet>
      <CreateExerciseSheet
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(ex) => {
          setCreating(false);
          if (single) {
            onPick([ex]);
            close();
          } else {
            setSelected((s) => [...s, ex]);
          }
        }}
      />
    </>
  );
}

export function CreateExerciseSheet({
  open,
  onClose,
  onCreated,
  initial,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (ex: Exercise) => void;
  initial?: Exercise;
  onSave?: (patch: Omit<Exercise, "id" | "custom">) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [muscle, setMuscle] = useState<MuscleGroup>(initial?.muscleGroup ?? "other");
  const [secondary, setSecondary] = useState<MuscleGroup[]>(initial?.secondaryMuscles ?? []);
  const [equipment, setEquipment] = useState<Equipment>(initial?.equipment ?? "none");
  const [type, setType] = useState<ExerciseType>(initial?.type ?? "weight_reps");
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");

  const submit = () => {
    const payload = { name: name.trim(), muscleGroup: muscle, secondaryMuscles: secondary, equipment, type, instructions: instructions.trim() };
    if (!payload.name) return;
    if (onSave) onSave(payload);
    else onCreated?.(addCustomExercise(payload));
    setName("");
    setInstructions("");
    setSecondary([]);
  };

  return (
    <Sheet open={open} onClose={onClose} tall>
      <div className="row-between" style={{ marginBottom: 12 }}>
        <button className="textbtn" onClick={onClose}>
          Cancel
        </button>
        <div className="bold">{initial ? "Edit Exercise" : "Create Exercise"}</div>
        <button className="textbtn" disabled={!name.trim()} onClick={submit}>
          Save
        </button>
      </div>
      <div style={{ overflowY: "auto" }}>
        <div className="field">
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cable Lateral Raise (Behind Back)" autoFocus />
        </div>
        <div className="field">
          <label>Exercise Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as ExerciseType)} className="pill" style={{ padding: 10, borderRadius: 8, border: 0 }}>
            {EXERCISE_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} ({t.hint})
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Equipment</label>
          <select value={equipment} onChange={(e) => setEquipment(e.target.value as Equipment)} className="pill" style={{ padding: 10, borderRadius: 8, border: 0 }}>
            {EQUIPMENT.map((e) => (
              <option key={e.id} value={e.id}>
                {equipmentLabel(e.id)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Primary Muscle Group</label>
          <select value={muscle} onChange={(e) => setMuscle(e.target.value as MuscleGroup)} className="pill" style={{ padding: 10, borderRadius: 8, border: 0 }}>
            {MUSCLE_GROUPS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Secondary Muscle Groups</label>
          <div className="pill-row" style={{ flexWrap: "wrap" }}>
            {MUSCLE_GROUPS.filter((m) => m.id !== muscle).map((m) => {
              const on = secondary.includes(m.id);
              return (
                <button
                  key={m.id}
                  className={`pill${on ? " active" : ""}`}
                  onClick={() => setSecondary((s) => (on ? s.filter((x) => x !== m.id) : [...s, m.id]))}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="field">
          <label>Instructions (optional)</label>
          <textarea rows={3} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Setup, cues, tempo…" />
        </div>
      </div>
    </Sheet>
  );
}
