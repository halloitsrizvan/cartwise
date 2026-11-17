import { ok, route } from "@/server/lib/route";
import { NoticePatchSchema } from "@/shared/schemas/domain";
import { noticeService } from "@/server/services/notice.service";

export const PATCH = route({ auth: ["admin"], body: NoticePatchSchema }, async ({ user, body, params }) =>
  ok(await noticeService.patch(user!.id, params.id, body)),
);
