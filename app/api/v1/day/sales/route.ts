import { ok, route } from "@/server/lib/route";
import { SalesBatchSchema } from "@/shared/schemas/domain";
import { dayService } from "@/server/services/day.service";

export const POST = route({ auth: ["vendor"], body: SalesBatchSchema }, async ({ user, body }) =>
  ok(await dayService.addSales(user!.id, body.events)),
);
