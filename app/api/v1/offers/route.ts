import { ok, route } from "@/server/lib/route";
import { offerService } from "@/server/services/offer.service";

export const GET = route({ auth: ["vendor"] }, async ({ user }) => ok(await offerService.feed(user!.id)));
