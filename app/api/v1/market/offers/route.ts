import { ok, route } from "@/server/lib/route";
import { OfferInputSchema } from "@/shared/schemas/domain";
import { offerService } from "@/server/services/offer.service";

export const GET = route({ auth: ["market"] }, async ({ user }) => ok(await offerService.listMine(user!.id)));
export const POST = route({ auth: ["market"], body: OfferInputSchema }, async ({ user, body }) =>
  ok(await offerService.create(user!.id, body), 201),
);
