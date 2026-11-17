import { ok, route } from "@/server/lib/route";
import { LoginSchema } from "@/shared/schemas/domain";
import { RATE } from "@/server/config/constants";
import { authService } from "@/server/services/auth.service";

export const POST = route({ body: LoginSchema, rateLimit: { name: "login", ...RATE.login } }, async ({ body }) =>
  ok(await authService.login(body.identifier, body.secret)),
);
