import { NextResponse } from "next/server";
import { route } from "@/server/lib/route";
import { healthService } from "@/server/services/health.service";

export const GET = route({}, async () => {
  const h = await healthService.check();
  return NextResponse.json({ data: h }, { status: h.db === "up" ? 200 : 503 });
});
