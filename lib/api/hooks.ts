"use client";
import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { cacheGet, cacheSet } from "@/lib/offline/db";
import type { ItemDTO } from "@/shared/schemas/domain";
import { api, ApiClientError } from "./client";
import type * as T from "./types";

/** GET with IndexedDB fallback so Sell / Close / Plan keep working with no network. */
async function cachedGet<D>(path: string): Promise<D> {
  try {
    const d = await api<D>(path);
    void cacheSet(path, d);
    return d;
  } catch (e) {
    if (!(e instanceof ApiClientError)) {
      const c = await cacheGet<D>(path);
      if (c !== undefined) return c;
    }
    throw e;
  }
}
function q<D>(key: QueryKey, path: string, opts: { cached?: boolean; enabled?: boolean } = {}) {
  return useQuery({ queryKey: key, queryFn: () => (opts.cached ? cachedGet<D>(path) : api<D>(path)), enabled: opts.enabled ?? true });
}

export const useMe = () => q<T.Me>(["me"], "/api/v1/auth/me", { cached: true });
export const useVendor = () => q<T.VendorMe>(["vendor"], "/api/v1/vendors/me", { cached: true });
export const useItems = (all = false) => q<ItemDTO[]>(["items", all], `/api/v1/items${all ? "?all=true" : ""}`, { cached: true });
export const useToday = () => q<T.Today>(["today"], "/api/v1/day/today", { cached: true });
export const usePlan = () => q<T.PlanView>(["plan"], "/api/v1/plan/tomorrow", { cached: true });
export const useMoney = (range: 7 | 30) => q<T.MoneySummary>(["money", range], `/api/v1/money/summary?range=${range}`, { cached: true });
export const useBeforeAfter = () => q<T.BeforeAfter>(["before-after"], "/api/v1/money/before-after", { cached: true });
export const useStatement = () => q<T.Statement>(["statement"], "/api/v1/passport");
export const useReadiness = () => q<T.Readiness>(["readiness"], "/api/v1/passport/readiness");
export const useShares = () => q<T.ShareLinkRow[]>(["shares"], "/api/v1/passport/share");
export const useOffers = () => q<T.OfferCard[]>(["offers"], "/api/v1/offers");
export const useNotices = () => q<T.NoticeRow[]>(["notices"], "/api/v1/notices");
export const usePublicStatement = (token: string) => q<T.PublicStatement>(["public", token], `/api/v1/public/passport/${token}`);

export const officer = {
  useOverview: () => q<T.OfficerOverview>(["o-overview"], "/api/v1/officer/overview"),
  useNotices: () => q<T.NoticeRow[]>(["o-notices"], "/api/v1/officer/notices"),
  useVendors: () => q<T.OfficerVendor[]>(["o-vendors"], "/api/v1/officer/vendors"),
  useSummary: (id: string | null) => q<T.AppSummary>(["o-summary", id], `/api/v1/officer/vendors/${id}/application-summary`, { enabled: !!id }),
  useMarkets: () => q<T.MarketRow[]>(["o-markets"], "/api/v1/officer/markets"),
};
export const market = {
  useStats: () => q<T.MarketStats>(["m-stats"], "/api/v1/market/stats"),
  useOffers: () => q<T.MarketOffer[]>(["m-offers"], "/api/v1/market/offers"),
};

/** Generic mutation helper that invalidates the given query-key prefixes. */
export function useApiMutation<B, R = unknown>(fn: (body: B) => Promise<R>, invalidate: QueryKey[] = [], onOk?: (r: R) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (r) => {
      invalidate.forEach((k) => qc.invalidateQueries({ queryKey: k }));
      onOk?.(r);
    },
  });
}

export const post = <R = unknown>(path: string, body?: unknown) => api<R>(path, { method: "POST", body: body ?? {} });
export const patch = <R = unknown>(path: string, body: unknown) => api<R>(path, { method: "PATCH", body });
export const del = <R = unknown>(path: string) => api<R>(path, { method: "DELETE" });
