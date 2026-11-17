import { ok, route } from "@/server/lib/route";
import { passportService } from "@/server/services/passport.service";

export const GET = route({ auth: ["vendor"] }, async ({ user }) => ok(await passportService.readiness(user!.id)));
