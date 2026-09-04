"use client";

import { useMemo, useState } from "react";
import { addMeasurement, deleteMeasurement } from "@/lib/actions";
import { useSettings, useStore } from "@/lib/store";
import { dateKey, fmtNum, kgToUnit, parseDateKey, unitToKg } from "@/lib/util";
import { useFormat } from "@/lib/useFormat";
import { LineChart } from "./Charts";
import { IPlus, ITrash } from "./Icons";
import { Sheet, TopBar, toast } from "./ui";

export function MeasuresScreen() {
  const measurements = useStore((s) => s.measurements);
  const settings = useSettings();
  const fmt = useFormat();
  const [adding, setAdding] = useState(false);
  const [date, setDate] = useState(dateKey(new Date()));
  const [weight, setWeight] = useState("");
  const [fat, setFat] = useState("");
  const [notes, setNotes] = useState("");

  const sorted = useMemo(() => [...measurements].sort((a, b) => (a.date < b.date ? 1 : -1)), [measurements]);
  const weightPoints = useMemo(
    () =>
      [...measurements]
        .filter((m) => m.weightKg != null)
        .sort((a, b) => (a.date < b.date ? -1 : 1))
        .map((m) => ({ x: parseDateKey(m.date).getTime(), y: kgToUnit(m.weightKg!, settings.weightUnit), label: parseDateKey(m.date).toLocaleDateString(undefined, { day: "numeric", month: "short" }) })),
    [measurements, settings.weightUnit]
  );
  const latest = sorted.find((m) => m.weightKg != null);

  const submit = () => {
    const w = parseFloat(weight.replace(",", "."));
    const f = parseFloat(fat.replace(",", "."));
    if (!Number.isFinite(w) && !Number.isFinite(f)) {
      toast("Enter a weight or body fat value");
      return;
    }
    addMeasurement({
      date,
      weightKg: Number.isFinite(w) ? unitToKg(w, settings.weightUnit) : null,
      bodyFatPct: Number.isFinite(f) ? f : null,
      notes: notes.trim(),
    });
    setAdding(false);
    setWeight("");
    setFat("");
    setNotes("");
    toast("Measurement saved");
  };

  return (
    <div className="screen">
      <TopBar
        onBack
        title="Measures"
        right={
          <button className="iconbtn accent" onClick={() => setAdding(true)} aria-label="Add measurement">
            <IPlus />
          </button>
        }
      />
      <div className="content">
        <div className="card">
          <div className="row-between">
            <div>
              <div className="tiny muted bold">Body weight</div>
              <div className="bold" style={{ fontSize: 22 }}>
                {latest ? fmt.weight(latest.weightKg!) : "—"}
              </div>
            </div>
            <button className="btn sm primary" onClick={() => setAdding(true)}>
              Log
            </button>
          </div>
          <div style={{ marginTop: 10 }}>
            <LineChart points={weightPoints} format={(y) => fmtNum(y, 1)} />
          </div>
        </div>

        <div className="section-title">History</div>
        {sorted.length === 0 && <div className="muted small" style={{ padding: "0 4px" }}>No measurements yet.</div>}
        <div className="card" style={{ padding: "4px 12px" }}>
          {sorted.map((m) => (
            <div key={m.id} className="settings-row">
              <div className="grow">
                <div className="label">{parseDateKey(m.date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</div>
                <div className="sub">
                  {m.weightKg != null ? fmt.weight(m.weightKg) : ""}
                  {m.weightKg != null && m.bodyFatPct != null ? " · " : ""}
                  {m.bodyFatPct != null ? `${fmtNum(m.bodyFatPct, 1)}% body fat` : ""}
                  {m.notes ? ` · ${m.notes}` : ""}
                </div>
              </div>
              <button className="iconbtn" onClick={() => deleteMeasurement(m.id)} aria-label="Delete">
                <ITrash size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <Sheet open={adding} onClose={() => setAdding(false)} title="Log Measurement">
        <div className="field">
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={dateKey(new Date())} />
        </div>
        <div className="field">
          <label>Body weight ({settings.weightUnit})</label>
          <input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={latest ? fmt.weight(latest.weightKg!, false) : "0"} />
        </div>
        <div className="field">
          <label>Body fat (%)</label>
          <input inputMode="decimal" value={fat} onChange={(e) => setFat(e.target.value)} placeholder="optional" />
        </div>
        <div className="field">
          <label>Notes</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="optional" />
        </div>
        <button className="btn primary" onClick={submit}>
          Save
        </button>
      </Sheet>
    </div>
  );
}
