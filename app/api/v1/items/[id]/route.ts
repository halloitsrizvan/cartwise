import { ok, route } from "@/server/lib/route";
import { ItemPatchSchema } from "@/shared/schemas/domain";
import { vendorService } from "@/server/services/vendor.service";

export const PATCH = route({ auth: ["vendor"], body: ItemPatchSchema }, async ({ user, body, params }) =>
  ok(await vendorService.updateItem(user!.id, params.id, body)),
);
export const DELETE = route({ auth: ["vendor"] }, async ({ user, params }) => ok(await vendorService.deleteItem(user!.id, params.id)));
