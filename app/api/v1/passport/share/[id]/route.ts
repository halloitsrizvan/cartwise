import { ok, route } from "@/server/lib/route";
import { passportService } from "@/server/services/passport.service";

export const DELETE = route({ auth: ["vendor"] }, async ({ user, params }) => ok(await passportService.revokeShare(user!.id, params.id)));
