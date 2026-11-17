import { ok, route } from "@/server/lib/route";
import { offerService } from "@/server/services/offer.service";

export const GET = route({ auth: ["officer"] }, async () => ok(await offerService.marketsForOfficer()));
