import { ok, route } from "@/server/lib/route";
import { SelfDeclaredSchema } from "@/shared/schemas/domain";
import { passportService } from "@/server/services/passport.service";

export const PATCH = route({ auth: ["vendor"], body: SelfDeclaredSchema }, async ({ user, body }) =>
  ok(await passportService.setSelfDeclared(user!.id, body)),
);
