import { ok, route } from "@/server/lib/route";
import { NoticeInputSchema } from "@/shared/schemas/domain";
import { noticeService } from "@/server/services/notice.service";

export const GET = route({ auth: ["admin"] }, async () => ok(await noticeService.listForOfficer()));
export const POST = route({ auth: ["admin"], body: NoticeInputSchema }, async ({ user, body }) =>
  ok(await noticeService.create(user!.id, body), 201),
);
