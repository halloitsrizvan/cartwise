/** Voice utterance -> sale lines. Pure. Never applied silently: the UI always shows a confirm sheet. */
export type VoiceItem = {
  id: string;
  name_ml: string;
  name_en: string;
  category_slug: string;
  unit_step: number;
};
export type VoiceHit = { item_id: string; qty: number };

const NUMBER_WORDS: Record<string, number> = {
  // Malayalam
  "ഒന്ന്": 1, "ഒരു": 1, "ഒന്നു": 1, "രണ്ട്": 2, "രണ്ടു": 2, "മൂന്ന്": 3, "മൂന്നു": 3, "നാല്": 4, "നാലു": 4,
  "അഞ്ച്": 5, "അഞ്ചു": 5, "ആറ്": 6, "ആറു": 6, "ഏഴ്": 7, "ഏഴു": 7, "എട്ട്": 8, "എട്ടു": 8,
  "ഒമ്പത്": 9, "ഒൻപത്": 9, "പത്ത്": 10, "പത്തു": 10,
  "അര": 0.5, "ഒന്നര": 1.5, "രണ്ടര": 2.5,
  // Manglish
  onnu: 1, oru: 1, randu: 2, rendu: 2, moonnu: 3, moonu: 3, naalu: 4, nalu: 4, anchu: 5, anju: 5,
  aaru: 6, aru: 6, ezhu: 7, ettu: 8, ombathu: 9, onpathu: 9, pathu: 10, ara: 0.5, onnara: 1.5, randara: 2.5,
  // English
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, half: 0.5,
  a: 1,
};
const UNIT_WORDS = new Set(["കിലോ", "കിലോയും", "kilo", "kg", "kilos", "കിലോഗ്രാം", "എണ്ണം", "number", "nos", "cup", "കപ്പ്", "glass", "ഗ്ലാസ്", "piece", "pieces", "pcs"]);
const FILLER = new Set(["and", "ഉം", "പിന്നെ", "pinne", "of", "add", "please", "ചേർക്കൂ", "വേണം"]);

/** Aliases by category_slug (Malayalam, English, Manglish). */
export const ALIASES: Record<string, string[]> = {
  mango: ["മാങ്ങ", "മാമ്പഴം", "mango", "manga", "maanga"],
  banana: ["വാഴപ്പഴം", "പഴം", "ഏത്തപ്പഴം", "banana", "pazham", "vazhapazham"],
  apple: ["ആപ്പിൾ", "ആപ്പിള്", "apple"],
  orange: ["ഓറഞ്ച്", "orange"],
  pineapple: ["പൈനാപ്പിൾ", "കൈതച്ചക്ക", "pineapple", "kaithachakka"],
  watermelon: ["തണ്ണിമത്തൻ", "തണ്ണിമത്തന്", "watermelon", "thannimathan"],
  tomato: ["തക്കാളി", "tomato", "thakkali"],
  onion: ["സവാള", "ഉള്ളി", "onion", "savala", "ulli"],
  potato: ["ഉരുളക്കിഴങ്ങ്", "ഉരുളക്കിഴങ്ങു", "potato", "urulakizhangu"],
  carrot: ["ക്യാരറ്റ്", "carrot", "carat"],
  beans: ["ബീൻസ്", "beans"],
  coconut: ["തേങ്ങ", "coconut", "thenga"],
  tea: ["ചായ", "tea", "chaya", "chai"],
  coffee: ["കാപ്പി", "coffee", "kaapi"],
  vada: ["പരിപ്പുവട", "വട", "vada", "vata", "parippu"],
  snack: ["പഴംപൊരി", "ഉള്ളിവട", "pazhampori", "pori", "snack"],
  lemon: ["നാരങ്ങ", "lemon", "lime", "naranga"],
  sugarcane: ["കരിമ്പ്", "sugarcane", "karimbu"],
};

export function normalizeNumberToken(tok: string): number | null {
  const t = tok.toLowerCase();
  if (/^\d+(\.\d+)?$/.test(t)) return parseFloat(t);
  if (/^\d+\/\d+$/.test(t)) {
    const [a, b] = t.split("/").map(Number);
    return b ? a / b : null;
  }
  return t in NUMBER_WORDS ? NUMBER_WORDS[t] : null;
}

function itemAliases(it: VoiceItem): string[] {
  const out = new Set<string>([it.name_ml.toLowerCase(), it.name_en.toLowerCase()]);
  for (const a of ALIASES[it.category_slug] ?? []) out.add(a.toLowerCase());
  return [...out].filter((a) => a.length >= 2);
}

export function parseSaleUtterance(text: string, items: VoiceItem[]): VoiceHit[] {
  const cleaned = text
    .toLowerCase()
    .replace(/[,.;!?]/g, " ")
    .replace(/(\d)\s*(kg|kilo|കിലോ)/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return [];
  const tokens = cleaned.split(" ").filter((t) => !FILLER.has(t));

  // number tokens and item tokens by index
  type Hit = { idx: number; item: VoiceItem; len: number };
  const hits: Hit[] = [];
  const aliasList = items.map((it) => ({ it, aliases: itemAliases(it).sort((a, b) => b.length - a.length) }));

  for (let i = 0; i < tokens.length; i++) {
    // try two-token phrase first, then one token
    for (const span of [2, 1]) {
      if (i + span > tokens.length) continue;
      const phrase = tokens.slice(i, i + span).join(" ");
      let found: VoiceItem | undefined;
      for (const { it, aliases } of aliasList) {
        if (aliases.some((a) => phrase === a || (a.length >= 3 && !/^[a-z]+$/.test(a) && phrase.startsWith(a)) || (/^[a-z]+$/.test(a) && phrase.replace(/s$/, "") === a))) {
          found = it;
          break;
        }
      }
      if (found) {
        hits.push({ idx: i, item: found, len: span });
        i += span - 1;
        break;
      }
    }
  }
  if (!hits.length) return [];

  const used = new Set<number>();
  const numAt = (j: number): number | null => (j >= 0 && j < tokens.length && !used.has(j) ? normalizeNumberToken(tokens[j]) : null);
  const isUnit = (j: number) => j >= 0 && j < tokens.length && UNIT_WORDS.has(tokens[j]);

  const merged = new Map<string, number>();
  for (const h of hits) {
    let qty: number | null = null;
    // look back: [number] [unit]? item
    let j = h.idx - 1;
    if (isUnit(j)) j--;
    const back = numAt(j);
    if (back !== null) {
      qty = back;
      used.add(j);
      // "ഒന്ന് അര" style compound: previous number + half
      const prev = numAt(j - 1);
      if (prev !== null && qty === 0.5) {
        qty = prev + 0.5;
        used.add(j - 1);
      }
    } else {
      // look ahead: item [number] [unit]?
      const k = h.idx + h.len;
      const fwd = numAt(k);
      if (fwd !== null) {
        qty = fwd;
        used.add(k);
      }
    }
    if (qty === null || qty <= 0) qty = h.item.unit_step >= 1 ? 1 : 1;
    merged.set(h.item.id, (merged.get(h.item.id) ?? 0) + qty);
  }
  return [...merged.entries()].map(([item_id, qty]) => ({ item_id, qty }));
}
