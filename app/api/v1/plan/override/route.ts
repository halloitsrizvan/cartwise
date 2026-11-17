import { ok, route } from "@/server/lib/route";
import { OverrideSchema } from "@/shared/schemas/domain";
import { planService } from "@/server/services/plan.service";

export const POST = route({ auth: ["vendor"], body: OverrideSchema }, async ({ user, body }) =>
  ok(await planService.override(user!.id, body)),
);
