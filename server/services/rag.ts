/**
 * Small, dependency-free retrieval for the assistant: BM25 over the knowledge base.
 * (No embedding provider is configured, so retrieval is lexical; Malayalam and English are both indexed.)
 */
import { KB, type KbChunk } from "../knowledge/kb";

const K1 = 1.5;
const B = 0.75;
const STOP = new Set(["the", "a", "an", "is", "are", "to", "of", "in", "on", "and", "or", "for", "how", "do", "i", "my", "me", "can", "what", "it", "does", "will", "with", "at", "this", "that", "you", "your", "ഞാൻ", "എന്റെ", "എങ്ങനെ", "എന്ത്", "ഒരു", "ആണ്", "ഉണ്ട്"]);

export function tokenize(text: string): string[] {
  return (text.toLowerCase().normalize("NFC").replace(/[‌‍]/g, "").match(/[\p{L}\p{M}\p{N}]+/gu) ?? []).filter((t) => t.length > 1 && !STOP.has(t));
}

/** Malayalam is agglutinative: also index a 5-character stem so inflected forms still match. */
function terms(text: string): string[] {
  const out: string[] = [];
  for (const t of tokenize(text)) {
    out.push(t);
    if (/[ഀ-ൿ]/.test(t) && t.length > 5) out.push(t.slice(0, 5));
  }
  return out;
}

type Doc = { chunk: KbChunk; tf: Map<string, number>; len: number };
let index: { docs: Doc[]; df: Map<string, number>; avg: number } | null = null;

function build(chunks: KbChunk[]) {
  const docs: Doc[] = chunks.map((chunk) => {
    const all = terms(`${chunk.title} ${chunk.title} ${chunk.tags ?? ""} ${chunk.tags ?? ""} ${chunk.en} ${chunk.ml}`);
    const tf = new Map<string, number>();
    for (const t of all) tf.set(t, (tf.get(t) ?? 0) + 1);
    return { chunk, tf, len: all.length };
  });
  const df = new Map<string, number>();
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  return { docs, df, avg: docs.reduce((s, d) => s + d.len, 0) / (docs.length || 1) };
}

export function retrieve(query: string, k = 4, chunks: KbChunk[] = KB): { chunk: KbChunk; score: number }[] {
  const idx = chunks === KB ? (index ??= build(KB)) : build(chunks);
  const q = [...new Set(terms(query))];
  if (!q.length) return [];
  const n = idx.docs.length;
  const scored = idx.docs.map((d) => {
    let score = 0;
    for (const t of q) {
      const f = d.tf.get(t);
      if (!f) continue;
      const df = idx.df.get(t) ?? 0;
      const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
      score += idf * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * d.len) / idx.avg)));
    }
    return { chunk: d.chunk, score };
  });
  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, k);
}
