import { ok, route } from "@/server/lib/route";
import { AppError } from "@/server/lib/errors";
import { voiceService } from "@/server/services/voice.service";

/** multipart/form-data: audio (file), lang ("ml" | "en"). Returns { text }. */
export const POST = route({ auth: ["vendor"], rateLimit: { name: "voice", limit: 20, windowSec: 60 } }, async ({ req, user }) => {
  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob)) throw AppError.badRequest("audio file is required");
  const lang = form?.get("lang") === "en" ? "en" : "ml";
  return ok(await voiceService.transcribe(user!.id, audio, lang));
});
