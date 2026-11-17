import { ok, route } from "@/server/lib/route";
import { offerService } from "@/server/services/offer.service";

export const GET = route({ auth: ["market"] }, async ({ user }) => ok(await offerService.stats(user!.id)));
