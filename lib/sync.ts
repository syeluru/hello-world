"use client";

// Optional cross-device sync: the whole app document is stored as one JSON row
// in Supabase. Last-writer-wins by `updatedAt`. Without env vars this is a no-op.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getState, normalize, replaceState, subscribe } from "./store";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const syncConfigured = Boolean(url && anonKey);

const TABLE = "app_state";
const ROW_ID = "default";

let client: SupabaseClient | null = null;
function sb(): SupabaseClient | null {
  if (!syncConfigured) return null;
  if (!client) client = createClient(url!, anonKey!);
  return client;
}

let lastPushed = 0;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let started = false;

export type SyncStatus = "off" | "idle" | "syncing" | "error";
let status: SyncStatus = syncConfigured ? "idle" : "off";
const statusListeners = new Set<(s: SyncStatus) => void>();
function setStatus(s: SyncStatus) {
  status = s;
  for (const l of statusListeners) l(s);
}
export function getSyncStatus(): SyncStatus {
  return status;
}
export function onSyncStatus(l: (s: SyncStatus) => void): () => void {
  statusListeners.add(l);
  return () => statusListeners.delete(l);
}

export async function pullRemote(): Promise<void> {
  const c = sb();
  if (!c) return;
  setStatus("syncing");
  const { data, error } = await c.from(TABLE).select("data, updated_at").eq("id", ROW_ID).maybeSingle();
  if (error) {
    console.warn("sync pull failed", error.message);
    setStatus("error");
    return;
  }
  if (data?.data) {
    const remote = normalize(data.data);
    if (remote.updatedAt > getState().updatedAt) {
      lastPushed = remote.updatedAt;
      replaceState(remote);
    }
  }
  setStatus("idle");
}

async function pushNow(): Promise<void> {
  const c = sb();
  if (!c) return;
  const doc = getState();
  if (doc.updatedAt <= lastPushed) return;
  setStatus("syncing");
  const { error } = await c
    .from(TABLE)
    .upsert({ id: ROW_ID, data: doc, updated_at: new Date(doc.updatedAt).toISOString() });
  if (error) {
    console.warn("sync push failed", error.message);
    setStatus("error");
    return;
  }
  lastPushed = doc.updatedAt;
  setStatus("idle");
}

function schedulePush() {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushNow();
  }, 1500);
}

/** Call once on the client after hydration. */
export function startSync(): void {
  if (started || !syncConfigured || typeof window === "undefined") return;
  started = true;
  void pullRemote().then(() => schedulePush());
  subscribe(() => {
    if (getState().updatedAt > lastPushed) schedulePush();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void pullRemote();
  });
  window.addEventListener("online", () => void pullRemote().then(() => schedulePush()));
}
