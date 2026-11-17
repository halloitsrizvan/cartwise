import { ok, route } from "@/server/lib/route";
import { OfferPatchSchema } from "@/shared/schemas/domain";
import { offerService } from "@/server/services/offer.service";

export const PATCH = route({ auth: ["market"], body: OfferPatchSchema }, async ({ user, body, params }) =>
  ok(await offerService.patch(user!.id, params.id, body)),
);
