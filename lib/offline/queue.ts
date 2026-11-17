"use client";
import { useSyncExternalStore } from "react";
import { ApiClientError, api } from "@/lib/api/client";
import { db, type QueueOp } from "./db";

type State = { pending: number; syncing: boolean; online: boolean; ops: QueueOp[]; version: number };
let state: State = { pending: 0, syncing: false, online: true, ops: [], version: 0 };
const listeners = new Set<() => void>();
const emit = (patch: Partial<State>) => {
  state = { ...state, ...patch, version: state.version + 1 };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useSyncState = () =>
  useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );

const syncedHandlers = new Set<() => void>();
/** Called after a successful flush (to refetch server data). */
export const onSynced = (fn: () => void) => {
  syncedHandlers.add(fn);
  return () => syncedHandlers.delete(fn);
};
const failHandlers = new Set<(msg: string) => void>();
export const onSyncFailure = (fn: (msg: string) => void) => {
  failHandlers.add(fn);
  return () => failHandlers.delete(fn);
};

/** Called with each op the moment the server accepted it (lets the UI patch caches without a dip). */
const appliedHandlers = new Set<(op: QueueOp) => void>();
export const onOpApplied = (fn: (op: QueueOp) => void) => {
  appliedHandlers.add(fn);
  return () => appliedHandlers.delete(fn);
};

async function load(): Promise<QueueOp[]> {
  try {
    return (await (await db()).getAllFromIndex("ops", "by-created")) as QueueOp[];
  } catch {
    return [];
  }
}
async function refresh() {
  const ops = await load();
  emit({ ops, pending: ops.length });
}

const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`);
export const newClientId = uid;

type NewOp = QueueOp extends infer O ? (O extends QueueOp ? Omit<O, "id" | "createdAt"> & { id?: string } : never) : never;
export async function enqueue(op: NewOp) {
  const full = { ...op, id: op.id ?? uid(), createdAt: Date.now() } as QueueOp;
  await (await db()).put("ops", full);
  await refresh();
  void flush();
  return full;
}

/** Remove a not-yet-synced sale (undo before sync). Returns true if it was still queued. */
export async function dequeueSale(clientId: string): Promise<boolean> {
  const d = await db();
  const ops = await load();
  const hit = ops.find((o) => o.kind === "sale" && o.clientId === clientId);
  if (!hit) return false;
  await d.delete("ops", hit.id);
  await refresh();
  return true;
}

const isNetworkError = (e: unknown) => !(e instanceof ApiClientError);
let flushing = false;

export async function flush(): Promise<void> {
  if (flushing || (typeof navigator !== "undefined" && !navigator.onLine)) return;
  flushing = true;
  emit({ syncing: true });
  let progressed = false;
  try {
    const d = await db();
    for (;;) {
      const ops = await load();
      if (!ops.length) break;
      const first = ops[0];
      try {
        if (first.kind === "sale") {
          const batch = [];
          for (const o of ops) {
            if (o.kind !== "sale") break;
            batch.push(o);
            if (batch.length >= 100) break;
          }
          await api("/api/v1/day/sales", {
            method: "POST",
            body: { events: batch.map((o) => ({ client_id: o.clientId, item_id: o.itemId, qty: o.qty, ts: o.ts })) },
          });
          for (const o of batch) {
            appliedHandlers.forEach((f) => f(o));
            await d.delete("ops", o.id);
          }
        } else if (first.kind === "void") {
          try {
            await api(`/api/v1/day/sales/${first.clientId}`, { method: "DELETE" });
          } catch (e) {
            if (!(e instanceof ApiClientError && e.status === 404)) throw e;
          }
          appliedHandlers.forEach((f) => f(first));
          await d.delete("ops", first.id);
        } else {
          await api("/api/v1/day/close", { method: "POST", body: first.payload });
          await d.delete("ops", first.id);
        }
        progressed = true;
        await refresh();
      } catch (e) {
        if (isNetworkError(e)) break; // offline / server unreachable: retry later
        const err = e as ApiClientError;
        if (err.status === 401 || err.status >= 500 || err.status === 429) break; // transient or needs login
        // permanent rejection (400/403/404/409): drop the op so the queue cannot jam
        await d.delete("ops", first.id);
        failHandlers.forEach((f) => f(err.message));
        await refresh();
      }
    }
  } finally {
    flushing = false;
    emit({ syncing: false });
    await refresh();
    if (progressed) syncedHandlers.forEach((f) => f());
  }
}

let started = false;
export function startSync() {
  if (started || typeof window === "undefined") return;
  started = true;
  emit({ online: navigator.onLine });
  const on = () => {
    emit({ online: true });
    void flush();
  };
  window.addEventListener("online", on);
  window.addEventListener("offline", () => emit({ online: false }));
  void refresh().then(() => flush());
  setInterval(() => {
    if (state.pending > 0) void flush();
  }, 15_000);
}
