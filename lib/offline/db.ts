"use client";
import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type QueueOp =
  | { id: string; kind: "sale"; clientId: string; itemId: string; qty: number; ts: string; billId?: string; payMethod?: "cash" | "upi"; createdAt: number }
  | { id: string; kind: "void"; clientId: string; itemId: string; qty: number; createdAt: number }
  | { id: string; kind: "close"; payload: unknown; createdAt: number };

interface CWDB extends DBSchema {
  ops: { key: string; value: QueueOp; indexes: { "by-created": number } };
  cache: { key: string; value: { value: unknown; at: number } };
}

let dbp: Promise<IDBPDatabase<CWDB>> | null = null;
export function db() {
  dbp ??= openDB<CWDB>("cartwise", 1, {
    upgrade(d) {
      d.createObjectStore("ops", { keyPath: "id" }).createIndex("by-created", "createdAt");
      d.createObjectStore("cache");
    },
  });
  return dbp;
}

export async function cacheSet(key: string, value: unknown) {
  try {
    await (await db()).put("cache", { value, at: Date.now() }, key);
  } catch {
    /* storage unavailable */
  }
}
export async function cacheGet<T>(key: string): Promise<T | undefined> {
  try {
    return ((await (await db()).get("cache", key))?.value as T) ?? undefined;
  } catch {
    return undefined;
  }
}
