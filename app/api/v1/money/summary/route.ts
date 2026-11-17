import { ok, route } from "@/server/lib/route";
import { RangeQuery } from "@/shared/schemas/domain";
import { moneyService } from "@/server/services/money.service";

export const GET = route({ auth: ["vendor"], query: RangeQuery }, async ({ user, query }) =>
  ok(await moneyService.summary(user!.id, query.range === "30" ? 30 : 7)),
);
