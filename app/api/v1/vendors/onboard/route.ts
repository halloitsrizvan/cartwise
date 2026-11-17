import { ok, route } from "@/server/lib/route";
import { OnboardSchema } from "@/shared/schemas/domain";
import { vendorService } from "@/server/services/vendor.service";

export const POST = route({ auth: ["vendor"], body: OnboardSchema }, async ({ user, body }) =>
  ok(await vendorService.onboard(user!.id, body)),
);
