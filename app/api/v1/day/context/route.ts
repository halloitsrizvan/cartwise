import { ok, route } from "@/server/lib/route";
import { ContextSchema, ForQuery } from "@/shared/schemas/domain";
import { dayService } from "@/server/services/day.service";
import { planService } from "@/server/services/plan.service";

export const PATCH = route({ auth: ["vendor"], body: ContextSchema, query: ForQuery }, async ({ user, body, query }) =>
  query.for === "tomorrow"
    ? ok(await planService.setTomorrowContext(user!.id, { rain: body.rain, festival: body.festival, paydayWeek: body.payday_week }))
    : ok(await dayService.setContext(user!.id, body)),
);
