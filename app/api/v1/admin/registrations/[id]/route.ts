import { ok, route } from "@/server/lib/route";
import { RegistrationPatchSchema } from "@/shared/schemas/domain";
import { adminService } from "@/server/services/admin.service";

export const PATCH = route({ auth: ["admin"], body: RegistrationPatchSchema }, async ({ user, body, params }) =>
  ok(await adminService.setRegistrationStatus(user!.id, params.id, body.status)),
);
