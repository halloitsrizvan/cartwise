import { ok, route } from "@/server/lib/route";
import { DemoLoginSchema } from "@/shared/schemas/domain";
import { RATE } from "@/server/config/constants";
import { authService } from "@/server/services/auth.service";

export const POST = route({ body: DemoLoginSchema, rateLimit: { name: "login", ...RATE.login } }, async ({ body }) =>
  ok(await authService.demo(body.role)),
);
