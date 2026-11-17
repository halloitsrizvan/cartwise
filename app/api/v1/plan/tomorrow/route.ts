import { ok, route } from "@/server/lib/route";
import { planService } from "@/server/services/plan.service";

export const GET = route({ auth: ["vendor"] }, async ({ user }) => ok(await planService.tomorrow(user!.id)));
