import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import ml from "@/messages/ml.json";

function walk(dir: string, out: string[] = []) {
  for (const f of readdirSync(dir)) {
    if (["node_modules", ".next", ".git"].includes(f)) continue;
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(f)) out.push(p);
  }
  return out;
}

describe("messages", () => {
  it("ml and en have identical keys", () => {
    expect(Object.keys(ml).sort()).toEqual(Object.keys(en).sort());
  });
  it("every static t(key) in the UI exists", () => {
    const keys = new Set(Object.keys(en));
    const missing: string[] = [];
    for (const f of [...walk("components"), ...walk("app"), ...walk("lib")]) {
      const src = readFileSync(f, "utf8");
      for (const m of src.matchAll(/\bt\(\s*"([a-z0-9_.]+)"/gi)) if (!keys.has(m[1])) missing.push(`${f}: ${m[1]}`);
    }
    expect(missing).toEqual([]);
  });
  it("interpolation placeholders match across languages", () => {
    const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
    const E = en as Record<string, string>;
    const M = ml as Record<string, string>;
    expect(Object.keys(E).filter((k) => ph(E[k]) !== ph(M[k]))).toEqual([]);
  });
});
