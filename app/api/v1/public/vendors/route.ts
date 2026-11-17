import { NextResponse } from "next/server";
import { PublicVendorsQuery } from "@/shared/schemas/domain";
import { clientIp } from "@/server/lib/rate-limit";
import { route } from "@/server/lib/route";
import { publicService } from "@/server/services/public.service";

export const GET = route({ query: PublicVendorsQuery }, async ({ req, query }) =>
  NextResponse.json({ data: await publicService.list(clientIp(req), query) }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }),
);
