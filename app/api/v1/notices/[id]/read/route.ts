import { ok, route } from "@/server/lib/route";
import { noticeService } from "@/server/services/notice.service";

export const POST = route({ auth: ["vendor"] }, async ({ user, params }) => ok(await noticeService.markRead(user!.id, params.id)));
