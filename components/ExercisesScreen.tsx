"use client";

import { useState } from "react";
import { muscleLabel } from "@/lib/exercises";
import { push } from "@/lib/nav";
import type { Equipment, MuscleGroup } from "@/lib/types";
import { CreateExerciseSheet, ExerciseAvatar, ExerciseFilters, useExerciseList } from "./ExercisePicker";
import { IPlus } from "./Icons";
import { TopBar, toast } from "./ui";

export function ExercisesScreen() {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | "">("");
  const [equipment, setEquipment] = useState<Equipment | "">("");
  const [creating, setCreating] = useState(false);
  const list = useExerciseList(query, muscle, equipment);

  // group alphabetically like Hevy
  const groups: { letter: string; items: typeof list }[] = [];
  for (const ex of list) {
    const letter = ex.name[0]!.toUpperCase();
    const g = groups[groups.length - 1];
    if (g && g.letter === letter) g.items.push(ex);
    else groups.push({ letter, items: [ex] });
  }

  return (
    <div className="screen">
      <TopBar
        onBack
        title="Exercises"
        right={
          <button className="iconbtn accent" onClick={() => setCreating(true)} aria-label="Create exercise">
            <IPlus />
          </button>
        }
      />
      <div className="content">
        <ExerciseFilters {...{ query, setQuery, muscle, setMuscle, equipment, setEquipment }} />
        <div className="tiny muted" style={{ margin: "8px 4px 0" }}>
          {list.length} exercises
        </div>
        {groups.map((g) => (
          <div key={g.letter}>
            <div className="section-title" style={{ marginTop: 12 }}>
              {g.letter}
            </div>
            {g.items.map((ex) => (
              <button key={ex.id} className="list-item" onClick={() => push({ type: "exerciseDetail", id: ex.id })}>
                <ExerciseAvatar ex={ex} />
                <div className="grow">
                  <div className="name">{ex.name}</div>
                  <div className="sub">
                    {muscleLabel(ex.muscleGroup)}
                    {ex.custom ? " · Custom" : ""}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>
      <CreateExerciseSheet
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(ex) => {
          setCreating(false);
          toast("Exercise created");
          push({ type: "exerciseDetail", id: ex.id });
        }}
      />
    </div>
  );
}
