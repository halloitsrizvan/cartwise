import { ok, route } from "@/server/lib/route";
import { dayService } from "@/server/services/day.service";

export const GET = route({ auth: ["vendor"] }, async ({ user }) => ok(await dayService.today(user!.id)));
