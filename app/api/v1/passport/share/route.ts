import { ok, route } from "@/server/lib/route";
import { ShareCreateSchema } from "@/shared/schemas/domain";
import { passportService } from "@/server/services/passport.service";

export const GET = route({ auth: ["vendor"] }, async ({ user }) => ok(await passportService.listShares(user!.id)));
export const POST = route({ auth: ["vendor"], body: ShareCreateSchema }, async ({ user, body }) =>
  ok(await passportService.createShare(user!.id, body.expires_in_days), 201),
);
