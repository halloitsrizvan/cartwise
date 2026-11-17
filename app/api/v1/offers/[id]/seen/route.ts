import { ok, route } from "@/server/lib/route";
import { offerService } from "@/server/services/offer.service";

export const POST = route({ auth: ["vendor"] }, async ({ user, params }) => ok(await offerService.markSeen(user!.id, params.id)));
