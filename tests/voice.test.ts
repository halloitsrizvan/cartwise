import { describe, expect, it } from "vitest";
import { parseSaleUtterance, type VoiceItem } from "@/shared/voice";

const items: VoiceItem[] = [
  { id: "mango", name_ml: "മാങ്ങ", name_en: "Mango", category_slug: "mango", unit_step: 0.5 },
  { id: "banana", name_ml: "വാഴപ്പഴം", name_en: "Banana", category_slug: "banana", unit_step: 0.5 },
  { id: "tea", name_ml: "ചായ", name_en: "Tea", category_slug: "tea", unit_step: 1 },
];
const q = (s: string) => Object.fromEntries(parseSaleUtterance(s, items).map((h) => [h.item_id, h.qty]));

describe("parseSaleUtterance", () => {
  it("parses digits and English", () => {
    expect(q("2 kg mango")).toEqual({ mango: 2 });
    expect(q("3 kilo banana and 2 mango")).toEqual({ banana: 3, mango: 2 });
  });
  it("parses Malayalam number words and item names", () => {
    expect(q("രണ്ട് കിലോ മാങ്ങ")).toEqual({ mango: 2 });
    expect(q("അഞ്ച് ചായ")).toEqual({ tea: 5 });
    expect(q("മൂന്ന് കിലോ വാഴപ്പഴം, പത്ത് ചായ")).toEqual({ banana: 3, tea: 10 });
  });
  it("handles half (അര) and compound halves", () => {
    expect(q("അര കിലോ മാങ്ങ")).toEqual({ mango: 0.5 });
    expect(q("ഒന്നര കിലോ മാങ്ങ")).toEqual({ mango: 1.5 });
    expect(q("half kg mango")).toEqual({ mango: 0.5 });
  });
  it("parses Manglish", () => {
    expect(q("randu kilo manga")).toEqual({ mango: 2 });
    expect(q("anchu chaya")).toEqual({ tea: 5 });
  });
  it("defaults to 1 when no number and returns [] for unknown items", () => {
    expect(q("mango")).toEqual({ mango: 1 });
    expect(parseSaleUtterance("hello world", items)).toEqual([]);
    expect(parseSaleUtterance("", items)).toEqual([]);
  });
  it("supports a number after the item", () => {
    expect(q("mango 4")).toEqual({ mango: 4 });
  });
});
