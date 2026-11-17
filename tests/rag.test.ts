import { describe, expect, it } from "vitest";
import { KB } from "@/server/knowledge/kb";
import { retrieve, tokenize } from "@/server/services/rag";

const top = (q: string) => retrieve(q, 1)[0]?.chunk.id;

describe("RAG retrieval (BM25)", () => {
  it("every chunk has both languages", () => {
    for (const c of KB) {
      expect(c.en.length).toBeGreaterThan(40);
      expect(c.ml.length).toBeGreaterThan(40);
    }
    expect(new Set(KB.map((c) => c.id)).size).toBe(KB.length);
  });
  it("finds the right guide section for English questions", () => {
    expect(top("How do I show a QR code for UPI payment?")).toBe("upi-qr");
    expect(top("how is tomorrow's buy plan decided")).toBe("plan");
    expect(top("share my income statement link on whatsapp")).toBe("income-proof");
    expect(top("what is PM SVANidhi loan checklist")).toBe("loan-checklist");
    expect(top("does it work without internet")).toBe("offline");
    expect(top("how to edit product price")).toBe("products");
  });
  it("finds the right section for Malayalam questions", () => {
    expect(top("UPI പേയ്‌മെന്റ് QR എങ്ങനെ")).toBe("upi-qr");
    expect(top("ഇന്റർനെറ്റ് ഇല്ലാതെ പ്രവർത്തിക്കുമോ")).toBe("offline");
    expect(top("വോയ്സ് ഉപയോഗിച്ച് വിൽപ്പന")).toBe("voice");
  });
  it("returns nothing for gibberish and handles empty input", () => {
    expect(retrieve("zzzqqq xxyyww")).toEqual([]);
    expect(retrieve("")).toEqual([]);
    expect(tokenize("The, a: Plan!")).toEqual(["plan"]);
  });
});
