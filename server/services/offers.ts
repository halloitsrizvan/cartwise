/** Pure offer matching. */
import { OFFER_CAP } from "../config/constants";

export type MatchItem = { id: string; categorySlug: string; buyPrice: number };
export type MatchOffer = {
  id: string;
  categorySlug: string;
  price: number;
  area: string;
  status: string;
  validFrom: Date;
  validTo: Date;
};
export type OfferMatch<O extends MatchOffer> = { offer: O; itemId: string; saving: number; recommendedQty: number };

const norm = (s: string) => s.trim().toLowerCase();

export function matchOffers<O extends MatchOffer>(
  items: MatchItem[],
  offers: O[],
  vendorArea: string,
  recommended: Record<string, number>,
  now: Date,
): OfferMatch<O>[] {
  const out: OfferMatch<O>[] = [];
  for (const o of offers) {
    if (o.status !== "active" || o.validFrom > now || o.validTo < now) continue;
    if (norm(o.area) !== norm(vendorArea)) continue;
    // an offer can match several items of the same category; take the best saving
    let best: OfferMatch<O> | null = null;
    for (const it of items) {
      if (it.categorySlug !== o.categorySlug) continue;
      const qty = recommended[it.id] ?? 0;
      const saving = Math.round((it.buyPrice - o.price) * qty);
      if (saving > 0 && (!best || saving > best.saving)) best = { offer: o, itemId: it.id, saving, recommendedQty: qty };
    }
    if (best) out.push(best);
  }
  return out.sort((a, b) => b.saving - a.saving).slice(0, OFFER_CAP);
}
