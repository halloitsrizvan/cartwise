import { ok, route } from "@/server/lib/route";
import { getCurrentProfile } from "@/server/lib/auth";
import { clientIp, rateLimit } from "@/server/lib/rate-limit";
import { ChatSchema } from "@/shared/schemas/domain";
import { chatService } from "@/server/services/chat.service";

/** Public (works on the landing page); vendors additionally get answers grounded in their own data. */
export const POST = route({ body: ChatSchema }, async ({ req, body }) => {
  const cur = await getCurrentProfile().catch(() => null);
  await rateLimit(`chat:${cur?.profile.id ?? clientIp(req)}`, 12, 60);
  return ok(await chatService.reply({ vendorId: cur?.role === "vendor" ? cur.profile.id : null, lang: body.lang, messages: body.messages }));
});
