import { ok, route } from "@/server/lib/route";
import { PlanSummarySchema } from "@/shared/schemas/domain";
import { planVoiceService } from "@/server/services/plan-voice.service";

export const POST = route({ auth: ["vendor"], body: PlanSummarySchema, rateLimit: { name: "plan-summary", limit: 10, windowSec: 60 } }, async ({ user, body }) =>
  ok(await planVoiceService.summary(user!.id, body.day, body.lang)),
);
