import { ok, route } from "@/server/lib/route";
import { NoticeInputSchema } from "@/shared/schemas/domain";
import { noticeService } from "@/server/services/notice.service";

export const GET = route({ auth: ["officer"] }, async () => ok(await noticeService.listForOfficer()));
export const POST = route({ auth: ["officer"], body: NoticeInputSchema }, async ({ user, body }) =>
  ok(await noticeService.create(user!.id, body), 201),
);
