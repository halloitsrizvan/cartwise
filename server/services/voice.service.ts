import { AppError } from "../lib/errors";
import { requireEnv } from "../lib/env";
import { vendorRepository } from "../repositories/vendor.repository";

const MAX_BYTES = 2 * 1024 * 1024;
const EXT: Record<string, string> = { "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a", "audio/mpeg": "mp3", "audio/wav": "wav", "audio/x-wav": "wav", "audio/aac": "m4a" };

export const voiceService = {
  /**
   * Speech -> text with Whisper (Groq). The vendor's own product names are passed as a hint so
   * "mango", "മാങ്ങ", "manga" are recognised correctly. Audio is not stored.
   */
  async transcribe(vendorId: string, file: Blob, lang: "ml" | "en"): Promise<{ text: string }> {
    if (file.size === 0) throw AppError.badRequest("Empty recording");
    if (file.size > MAX_BYTES) throw AppError.badRequest("Recording is too long");
    const base = (file.type || "audio/webm").split(";")[0].toLowerCase();
    if (!base.startsWith("audio/") && base !== "video/webm") throw AppError.badRequest("Unsupported audio type");

    const items = await vendorRepository.listItems(vendorId);
    const hint = items.map((i) => (lang === "ml" ? i.nameMl : i.nameEn)).join(", ");

    const body = new FormData();
    body.set("file", file, `voice.${EXT[base] ?? "webm"}`);
    body.set("model", "whisper-large-v3-turbo");
    body.set("language", lang);
    body.set("temperature", "0");
    body.set("response_format", "json");
    if (hint) body.set("prompt", lang === "ml" ? `വിൽപ്പന: ${hint}` : `Sale of: ${hint}`);

    let res: Response;
    try {
      res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${requireEnv("GROQ_API_KEY")}` },
        body,
        signal: AbortSignal.timeout(20_000),
      });
    } catch (e) {
      if (e instanceof AppError) throw e;
      console.error("[voice] transcription request failed", e);
      throw new AppError(502, "INTERNAL", "Voice service is unavailable");
    }
    if (!res.ok) {
      console.error("[voice] transcription failed", res.status);
      throw new AppError(502, "INTERNAL", "Voice service is unavailable");
    }
    const json = (await res.json()) as { text?: string };
    return { text: (json.text ?? "").trim() };
  },
};
