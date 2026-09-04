import type { DistanceUnit, WeightUnit } from "./types";

export function uid(prefix = ""): string {
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return prefix ? `${prefix}_${rnd}` : rnd;
}

export const KG_PER_LB = 0.45359237;

export function kgToUnit(kg: number, unit: WeightUnit): number {
  return unit === "kg" ? kg : kg / KG_PER_LB;
}
export function unitToKg(value: number, unit: WeightUnit): number {
  return unit === "kg" ? value : value * KG_PER_LB;
}
export function metresToUnit(m: number, unit: DistanceUnit): number {
  return unit === "km" ? m / 1000 : m / 1609.344;
}
export function unitToMetres(v: number, unit: DistanceUnit): number {
  return unit === "km" ? v * 1000 : v * 1609.344;
}

/** Trim trailing zeros: 60 -> "60", 62.5 -> "62.5", 62.4999 -> "62.5". */
export function fmtNum(n: number, maxDecimals = 2): string {
  if (!Number.isFinite(n)) return "0";
  const rounded = Math.round(n * 10 ** maxDecimals) / 10 ** maxDecimals;
  return String(rounded);
}

export function fmtWeight(kg: number, unit: WeightUnit, withUnit = true): string {
  const v = fmtNum(kgToUnit(kg, unit), 1);
  return withUnit ? `${v} ${unit}` : v;
}

export function fmtVolume(kg: number, unit: WeightUnit): string {
  const v = kgToUnit(kg, unit);
  const s = v >= 10000 ? Math.round(v).toLocaleString() : fmtNum(v, 1);
  return `${s} ${unit}`;
}

export function fmtDistance(m: number, unit: DistanceUnit): string {
  return `${fmtNum(metresToUnit(m, unit), 2)} ${unit}`;
}

/** 90 -> "1:30", 3661 -> "1:01:01". */
export function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? h + ":" : ""}${mm}:${String(sec).padStart(2, "0")}`;
}

/** 90 -> "1min 30s", 3600 -> "1h", 45 -> "45s". */
export function fmtDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}min`);
  if (sec && !h) parts.push(`${sec}s`);
  return parts.length ? parts.join(" ") : "0s";
}

export function parseClock(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  if (/^\d+$/.test(t)) return Number(t);
  const parts = t.split(":").map((p) => Number(p));
  if (parts.some((p) => !Number.isFinite(p))) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

export function dateKey(d: Date | number): string {
  const dt = typeof d === "number" ? new Date(d) : d;
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function fmtDate(ts: number, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Date(ts).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", ...opts });
}

export function fmtDateLong(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** "3 hours ago", "Yesterday", "12 Mar". */
export function fmtRelative(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24 && dateKey(ts) === dateKey(now)) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateKey(ts) === dateKey(yesterday)) return "Yesterday";
  const d = Math.floor(diff / 86400000);
  if (d < 7) return `${d} days ago`;
  const sameYear = new Date(ts).getFullYear() === new Date(now).getFullYear();
  return new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short", year: sameYear ? undefined : "numeric" });
}

/** Start (00:00) of the week containing ts. */
export function startOfWeek(ts: number, firstWeekday: 0 | 1): Date {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const diff = (d.getDay() - firstWeekday + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

export function timeOfDayTitle(ts = Date.now()): string {
  const h = new Date(ts).getHours();
  if (h < 12) return "Morning Workout";
  if (h < 17) return "Afternoon Workout";
  if (h < 21) return "Evening Workout";
  return "Night Workout";
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function initials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((p) => /^[A-Za-z0-9]/.test(p));
  if (!parts.length) return "?";
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
