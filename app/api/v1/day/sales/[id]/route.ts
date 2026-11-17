import { ok, route } from "@/server/lib/route";
import { dayService } from "@/server/services/day.service";

export const DELETE = route({ auth: ["vendor"] }, async ({ user, params }) => ok(await dayService.voidSale(user!.id, params.id)));
