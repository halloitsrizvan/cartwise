import { ok, route } from "@/server/lib/route";
import { RegisterMarketSchema } from "@/shared/schemas/domain";
import { RATE } from "@/server/config/constants";
import { authService } from "@/server/services/auth.service";

export const POST = route({ body: RegisterMarketSchema, rateLimit: { name: "register", ...RATE.login } }, async ({ body }) =>
  ok(await authService.registerMarket(body), 201),
);
