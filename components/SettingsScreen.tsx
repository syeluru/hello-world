"use client";

import { useEffect, useRef, useState } from "react";
import { exportJSON, importJSON, resetAll, updateSettings } from "@/lib/actions";
import { useSettings, useStore } from "@/lib/store";
import { getSyncStatus, onSyncStatus, pullRemote, syncConfigured, type SyncStatus } from "@/lib/sync";
import type { Settings as SettingsT } from "@/lib/types";
import { fmtDuration } from "@/lib/util";
import { REST_OPTIONS } from "./ExerciseEditor";
import { ICheck } from "./Icons";
import { Confirm, Prompt, SettingsRow, Sheet, Switch, TopBar, toast } from "./ui";

export function SettingsScreen() {
  const settings = useSettings();
  const workouts = useStore((s) => s.workouts.length);
  const [restPicker, setRestPicker] = useState(false);
  const [namePrompt, setNamePrompt] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmImport, setConfirmImport] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [sync, setSync] = useState<SyncStatus>(getSyncStatus());
  useEffect(() => onSyncStatus(setSync), []);

  const set = (patch: Partial<SettingsT>) => updateSettings(patch);

  const doExport = () => {
    const blob = new Blob([exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workouts-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="screen">
      <TopBar onBack title="Settings" />
      <div className="content">
        <div className="section-title">Profile</div>
        <div className="card" style={{ padding: "4px 12px" }}>
          <SettingsRow label="Name" value={settings.name} onClick={() => setNamePrompt(true)} />
        </div>

        <div className="section-title">Workouts</div>
        <div className="card" style={{ padding: "4px 12px" }}>
          <SettingsRow label="Weight unit" right={<UnitToggle value={settings.weightUnit} options={["kg", "lb"]} onChange={(v) => set({ weightUnit: v })} />} />
          <SettingsRow label="Distance unit" right={<UnitToggle value={settings.distanceUnit} options={["km", "mi"]} onChange={(v) => set({ distanceUnit: v })} />} />
          <SettingsRow label="Default rest timer" sub="Used by exercises without their own timer" value={settings.defaultRestSec === 0 ? "Off" : fmtDuration(settings.defaultRestSec)} onClick={() => setRestPicker(true)} />
          <SettingsRow label="Rest timer sound" sub="Beep and vibrate when rest ends" right={<Switch on={settings.restTimerSound} onChange={(v) => set({ restTimerSound: v })} />} />
          <SettingsRow label="Keep screen awake" sub="During an active workout (where supported)" right={<Switch on={settings.keepScreenOn} onChange={(v) => set({ keepScreenOn: v })} />} />
          <SettingsRow label="Show previous values" sub="Previous column in the workout table" right={<Switch on={settings.showPreviousInWorkout} onChange={(v) => set({ showPreviousInWorkout: v })} />} />
        </div>

        <div className="section-title">Appearance</div>
        <div className="card" style={{ padding: "4px 12px" }}>
          <SettingsRow label="Theme" right={<UnitToggle value={settings.theme} options={["dark", "light"]} labels={{ dark: "Dark", light: "Light" }} onChange={(v) => set({ theme: v })} />} />
          <SettingsRow label="First day of week" right={<UnitToggle value={String(settings.firstWeekday) as "0" | "1"} options={["1", "0"]} labels={{ "1": "Monday", "0": "Sunday" }} onChange={(v) => set({ firstWeekday: v === "0" ? 0 : 1 })} />} />
        </div>

        <div className="section-title">Data</div>
        <div className="card" style={{ padding: "4px 12px" }}>
          <SettingsRow
            label="Sync"
            sub={syncConfigured ? "Supabase sync is configured" : "Data is stored in this browser. Set up Supabase in .env.local to sync across devices."}
            value={syncConfigured ? (sync === "syncing" ? "Syncing…" : sync === "error" ? "Error" : "On") : "Off"}
            onClick={syncConfigured ? () => void pullRemote().then(() => toast("Synced")) : undefined}
          />
          <SettingsRow label="Export data" sub={`${workouts} workouts as JSON`} onClick={doExport} />
          <SettingsRow label="Import data" sub="Replace everything with a previously exported file" onClick={() => fileRef.current?.click()} />
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setConfirmImport(await f.text());
            }}
          />
          <button className="settings-row" onClick={() => setConfirmReset(true)}>
            <div className="grow">
              <div className="label red">Delete all data</div>
              <div className="sub">Removes workouts, routines and custom exercises</div>
            </div>
          </button>
        </div>

        <div className="section-title">About</div>
        <div className="card small muted">
          A self-hosted, Hevy-style workout tracker. Add it to your home screen for an app-like experience. Your data stays with you.
        </div>
      </div>

      <Sheet open={restPicker} onClose={() => setRestPicker(false)} title="Default Rest Timer">
        {REST_OPTIONS.map((sec) => (
          <button
            key={sec}
            className={`list-item${sec === settings.defaultRestSec ? " selected" : ""}`}
            onClick={() => {
              set({ defaultRestSec: sec });
              setRestPicker(false);
            }}
          >
            <span className="grow name">{sec === 0 ? "Off" : fmtDuration(sec)}</span>
            {sec === settings.defaultRestSec && (
              <span className="accent">
                <ICheck size={18} />
              </span>
            )}
          </button>
        ))}
      </Sheet>
      <Prompt open={namePrompt} onClose={() => setNamePrompt(false)} title="Your name" initial={settings.name} onSubmit={(name) => set({ name })} />
      <Confirm
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Delete all data?"
        message="This cannot be undone. Export first if you want a backup."
        confirmLabel="Delete everything"
        danger
        onConfirm={() => {
          resetAll();
          toast("All data deleted");
        }}
      />
      <Confirm
        open={!!confirmImport}
        onClose={() => setConfirmImport(null)}
        title="Import data?"
        message="This replaces all current workouts, routines and settings with the file contents."
        confirmLabel="Import"
        danger
        onConfirm={() => {
          if (!confirmImport) return;
          const r = importJSON(confirmImport);
          toast(r.ok ? "Data imported" : `Import failed: ${r.error}`);
        }}
      />
    </div>
  );
}

function UnitToggle<T extends string>({ value, options, labels, onChange }: { value: T; options: T[]; labels?: Record<string, string>; onChange: (v: T) => void }) {
  return (
    <div className="segmented" style={{ minWidth: 130 }}>
      {options.map((o) => (
        <button key={o} className={o === value ? "active" : ""} onClick={() => onChange(o)}>
          {labels?.[o] ?? o}
        </button>
      ))}
    </div>
  );
}
