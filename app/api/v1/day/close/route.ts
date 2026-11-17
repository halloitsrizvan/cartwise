import { ok, route } from "@/server/lib/route";
import { CloseDayBodySchema, type CloseDayInput } from "@/shared/schemas/domain";
import { dayService } from "@/server/services/day.service";

export const POST = route({ auth: ["vendor"], body: CloseDayBodySchema }, async ({ user, body }) =>
  ok(await dayService.close(user!.id, "items" in body ? (body as CloseDayInput) : undefined)),
);
