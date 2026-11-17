import { ok, route } from "@/server/lib/route";
import { offerService } from "@/server/services/offer.service";

export const POST = route({ auth: ["vendor"], rateLimit: { name: "report", limit: 10, windowSec: 60 } }, async ({ params }) =>
  ok(await offerService.report(params.id)),
);
