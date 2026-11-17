import { ok, route } from "@/server/lib/route";
import { VendorPatchSchema } from "@/shared/schemas/domain";
import { vendorService } from "@/server/services/vendor.service";

export const GET = route({ auth: ["vendor"] }, async ({ user }) => ok(await vendorService.me(user!.id)));
export const PATCH = route({ auth: ["vendor"], body: VendorPatchSchema }, async ({ user, body }) =>
  ok(await vendorService.patch(user!.id, body)),
);
