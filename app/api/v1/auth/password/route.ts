import { ok, route } from "@/server/lib/route";
import { PasswordChangeSchema } from "@/shared/schemas/domain";
import { authService } from "@/server/services/auth.service";

export const POST = route({ auth: ["vendor"], body: PasswordChangeSchema, rateLimit: { name: "password", limit: 5, windowSec: 60 } }, async ({ user, body }) =>
  ok(await authService.changePassword(user!.id, user!.email ?? "", body.current_password, body.new_password)),
);
