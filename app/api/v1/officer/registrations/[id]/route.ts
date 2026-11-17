import { ok, route } from "@/server/lib/route";
import { RegistrationPatchSchema } from "@/shared/schemas/domain";
import { officerService } from "@/server/services/officer.service";

export const PATCH = route({ auth: ["officer"], body: RegistrationPatchSchema }, async ({ user, body, params }) =>
  ok(await officerService.setRegistrationStatus(user!.id, params.id, body.status)),
);
