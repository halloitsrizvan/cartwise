import { ok, route } from "@/server/lib/route";
import { noticeService } from "@/server/services/notice.service";

export const GET = route({ auth: ["vendor"] }, async ({ user }) => ok(await noticeService.listForVendor(user!.id)));
