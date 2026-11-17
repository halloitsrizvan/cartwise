import { ok, route } from "@/server/lib/route";
import { z } from "zod";
import { ItemInputSchema } from "@/shared/schemas/domain";
import { vendorService } from "@/server/services/vendor.service";

export const GET = route({ auth: ["vendor"], query: z.object({ all: z.enum(["true", "false"]).optional() }) }, async ({ user, query }) =>
  ok(await vendorService.listItems(user!.id, query.all === "true")),
);
export const POST = route({ auth: ["vendor"], body: ItemInputSchema }, async ({ user, body }) =>
  ok(await vendorService.createItem(user!.id, body), 201),
);
