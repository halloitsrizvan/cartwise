import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "@/server/lib/errors";
import { route } from "@/server/lib/route";
import { KERALA_AREAS } from "@/shared/catalog";

const Query = z.object({ lat: z.coerce.number().min(-90).max(90), lon: z.coerce.number().min(-180).max(180) });

type Addr = Record<string, string | undefined>;
const clean = (s?: string) => s?.replace(/\s+(district|taluk|corporation|municipality)$/i, "").trim();
const ALIAS: Record<string, string> = { cochin: "Kochi", trivandrum: "Thiruvananthapuram", calicut: "Kozhikode" };
const snap = (s: string) => ALIAS[s.toLowerCase()] ?? KERALA_AREAS.find((k) => k.toLowerCase() === s.toLowerCase()) ?? s;

/** Reverse geocode via OpenStreetMap Nominatim, server side (proper User-Agent, coordinates rounded to ~100 m). */
export const GET = route({ query: Query, rateLimit: { name: "geo", limit: 20, windowSec: 60 } }, async ({ query }) => {
  const lat = query.lat.toFixed(3);
  const lon = query.lon.toFixed(3);
  let json: { address?: Addr } | null = null;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16&addressdetails=1&accept-language=en&lat=${lat}&lon=${lon}`, {
      headers: { "User-Agent": "CartWise/1.0 (vendor area lookup)", Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(String(res.status));
    json = await res.json();
  } catch {
    throw new AppError(502, "INTERNAL", "Location lookup is unavailable");
  }
  const a = json?.address ?? {};
  const locality = clean(a.suburb ?? a.neighbourhood ?? a.quarter ?? a.village ?? a.hamlet);
  const city = clean(a.city ?? a.town ?? a.municipality);
  const district = clean(a.state_district ?? a.county);
  const suggestions = [...new Set([district, city, locality].filter((x): x is string => !!x).map(snap))];
  if (!suggestions.length) throw AppError.notFound("No area found");
  return NextResponse.json({ data: { area: suggestions[0], suggestions } });
});
