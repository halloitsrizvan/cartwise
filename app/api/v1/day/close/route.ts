import { ok, route } from "@/server/lib/route";
import { CloseDaySchema } from "@/shared/schemas/domain";
import { dayService } from "@/server/services/day.service";

export const POST = route({ auth: ["vendor"], body: CloseDaySchema }, async ({ user, body }) =>
  ok(await dayService.close(user!.id, body)),
);
