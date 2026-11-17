import { ok, route } from "@/server/lib/route";
import { PaymentsQuery } from "@/shared/schemas/domain";
import { dayService } from "@/server/services/day.service";

export const GET = route({ auth: ["vendor"], query: PaymentsQuery }, async ({ user, query }) =>
  ok(await dayService.payments(user!.id, Number(query.range))),
);
