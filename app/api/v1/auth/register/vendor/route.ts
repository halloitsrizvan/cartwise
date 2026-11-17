import { ok, route } from "@/server/lib/route";
import { RegisterVendorSchema } from "@/shared/schemas/domain";
import { RATE } from "@/server/config/constants";
import { authService } from "@/server/services/auth.service";

export const POST = route({ body: RegisterVendorSchema, rateLimit: { name: "register", ...RATE.login } }, async ({ body }) =>
  ok(await authService.registerVendor(body.phone, body.pin), 201),
);
