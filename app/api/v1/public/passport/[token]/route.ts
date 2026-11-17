import { NextResponse } from "next/server";
import { clientIp } from "@/server/lib/rate-limit";
import { route } from "@/server/lib/route";
import { passportService } from "@/server/services/passport.service";

export const GET = route({}, async ({ req, params }) => {
  const data = await passportService.publicStatement(params.token, clientIp(req));
  return NextResponse.json({ data }, { headers: { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" } });
});
