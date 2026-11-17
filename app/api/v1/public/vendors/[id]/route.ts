import { NextResponse } from "next/server";
import { clientIp } from "@/server/lib/rate-limit";
import { route } from "@/server/lib/route";
import { publicService } from "@/server/services/public.service";

export const GET = route({}, async ({ req, params }) =>
  NextResponse.json({ data: await publicService.profile(clientIp(req), params.id) }, { headers: { "Cache-Control": "public, s-maxage=60" } }),
);
