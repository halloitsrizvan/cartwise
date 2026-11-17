"use client";
import { useMemo } from "react";
import { useToday } from "@/lib/api/hooks";
import type { TodayItem } from "@/lib/api/types";
import { dequeueSale, enqueue, newClientId, useSyncState } from "@/lib/offline/queue";

/** Server totals plus whatever is still waiting in the offline queue (optimistic). */
export function useLiveToday() {
  const q = useToday();
  const sync = useSyncState();
  const items = useMemo<TodayItem[]>(() => {
    const delta = new Map<string, number>();
    for (const op of sync.ops) {
      if (op.kind === "sale") delta.set(op.itemId, (delta.get(op.itemId) ?? 0) + op.qty);
      else if (op.kind === "void") delta.set(op.itemId, (delta.get(op.itemId) ?? 0) - op.qty);
    }
    return (q.data?.items ?? []).map((i) => ({ ...i, sold_qty: Math.max(0, Math.round(((i.sold_qty ?? 0) + (delta.get(i.id) ?? 0)) * 1000) / 1000) }));
  }, [q.data, sync.ops]);
  const total = items.reduce((s, i) => s + i.sold_qty * i.sell_price, 0);
  const closePending = sync.ops.some((o) => o.kind === "close");
  return { ...q, items, total, closePending, closed: q.data?.log.status === "closed" || closePending };
}

export type SaleAction = { clientId: string; itemId: string; name: string; qty: number };

export async function recordSale(itemId: string, qty: number): Promise<string> {
  const clientId = newClientId();
  await enqueue({ kind: "sale", clientId, itemId, qty, ts: new Date().toISOString() });
  return clientId;
}

/** Undo: drop it from the queue if unsynced, otherwise queue a void. */
export async function undoSale(a: { clientId: string; itemId: string; qty: number }) {
  const wasQueued = await dequeueSale(a.clientId);
  if (!wasQueued) await enqueue({ kind: "void", clientId: a.clientId, itemId: a.itemId, qty: a.qty });
}
