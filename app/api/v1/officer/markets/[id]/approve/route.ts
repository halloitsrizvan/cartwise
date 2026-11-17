import { ok, route } from "@/server/lib/route";
import { MarketApproveSchema } from "@/shared/schemas/domain";
import { offerService } from "@/server/services/offer.service";

export const PATCH = route({ auth: ["officer"], body: MarketApproveSchema }, async ({ user, body, params }) =>
  ok(await offerService.approveMarket(user!.id, params.id, body.approved)),
);
