import { ok, route } from "@/server/lib/route";
import { PinChangeSchema } from "@/shared/schemas/domain";
import { authService } from "@/server/services/auth.service";

export const POST = route({ auth: ["vendor"], body: PinChangeSchema, rateLimit: { name: "pin", limit: 5, windowSec: 60 } }, async ({ user, body }) =>
  ok(await authService.changePin(user!.id, user!.phone ?? "", body.current_pin, body.new_pin)),
);
