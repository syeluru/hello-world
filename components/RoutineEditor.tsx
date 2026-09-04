"use client";

import { useState } from "react";
import { createRoutine, updateRoutine } from "@/lib/actions";
import { back } from "@/lib/nav";
import { useStore } from "@/lib/store";
import type { WorkoutExercise } from "@/lib/types";
import { ExerciseEditor } from "./ExerciseEditor";
import { Confirm, TopBar, toast } from "./ui";

export function RoutineEditor({ id, folderId }: { id: string | null; folderId?: string | null }) {
  const existing = useStore((s) => (id ? s.routines.find((r) => r.id === id) : undefined));
  const [title, setTitle] = useState(existing?.title ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [exercises, setExercises] = useState<WorkoutExercise[]>(existing?.exercises ?? []);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const dirty = title !== (existing?.title ?? "") || notes !== (existing?.notes ?? "") || JSON.stringify(exercises) !== JSON.stringify(existing?.exercises ?? []);

  const save = () => {
    if (!title.trim()) {
      toast("Give the routine a title");
      return;
    }
    if (existing) {
      updateRoutine(existing.id, { title: title.trim(), notes, exercises });
      toast("Routine updated");
    } else {
      createRoutine({ title, notes, folderId: folderId ?? null, exercises });
      toast("Routine created");
    }
    back();
  };

  return (
    <div className="screen no-tabs">
      <TopBar
        bordered
        left={
          <button className="textbtn" onClick={() => (dirty ? setConfirmCancel(true) : back())}>
            Cancel
          </button>
        }
        title={existing ? "Edit Routine" : "Create Routine"}
        right={
          <button className="btn primary sm" onClick={save} disabled={!title.trim()}>
            Save
          </button>
        }
      />
      <div className="content">
        <input className="title-input" placeholder="Routine title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus={!existing} />
        <textarea className="notes-input" rows={1} placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="divider" style={{ margin: 0 }} />
      {exercises.length === 0 && (
        <div className="empty" style={{ paddingBottom: 0 }}>
          <div className="icon">📋</div>
          <h3>Get started by adding an exercise to your routine.</h3>
        </div>
      )}
      <ExerciseEditor mode="routine" exercises={exercises} onChange={setExercises} />
      <Confirm
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Discard changes?"
        message="Your changes to this routine will be lost."
        confirmLabel="Discard"
        danger
        onConfirm={back}
      />
    </div>
  );
}
