import { ok, route } from "@/server/lib/route";
import { moneyService } from "@/server/services/money.service";

export const GET = route({ auth: ["vendor"] }, async ({ user }) => ok(await moneyService.beforeAfter(user!.id)));
