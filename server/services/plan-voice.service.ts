import { AppError } from "../lib/errors";
import { requireEnv } from "../lib/env";
import { planService } from "./plan.service";

const MODEL = process.env.CHAT_MODEL ?? "openai/gpt-oss-120b";
const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const REASON: Record<string, string> = {
  WEEKDAY_HIGH: "this weekday usually sells more",
  WEEKDAY_LOW: "this weekday usually sells less",
  RAIN_DOWN: "rain may reduce sales",
  RAIN_UP: "rain brings more tea customers",
  FESTIVAL_UP: "festival means more customers",
  PAYDAY_UP: "payday week means more spending",
  SOLD_OUT_BOOST: "stock ran out recently",
  TREND_UP: "sales are growing",
  TREND_DOWN: "sales are going down",
  FEW_DATA: "only a few days of data so far",
};

const SYSTEM = `You write a short script that a text-to-speech voice will read aloud to a street vendor, summarising their buy plan page.
Rules:
- Use ONLY the data given. Never invent items, quantities or amounts.
- 5 to 8 short, simple spoken sentences. Plain text only: no markdown, no bullet points, no emojis, no symbols like Rs or the rupee sign (say "rupees").
- Say the day, the expected profit and total spend, then each product with its quantity and unit (say them all, most important first), then the one or two most useful reasons (rain, festival, weekday, sold out), then one friendly tip. Mention if confidence is low because there is little data.
- Write numbers as digits (the voice reads them). Use the language requested. For Malayalam use simple everyday words and Malayalam script.`;

export const planVoiceService = {
  /** Summarise the plan page into a spoken script (LLM). */
  async summary(vendorId: string, day: "today" | "tomorrow", lang: "ml" | "en") {
    const plan = day === "today" ? await planService.forToday(vendorId) : await planService.tomorrow(vendorId);
    if (!plan.lines.length) throw AppError.notFound("No plan yet");

    const data = {
      day: day === "today" ? "today" : `tomorrow (${WEEKDAY[plan.weekday]})`,
      weekday: WEEKDAY[plan.weekday],
      expected_profit_rupees: plan.total_expected_profit,
      total_spend_rupees: plan.total_spend,
      confidence: plan.confidence,
      rain: plan.context.rain,
      festival: plan.context.festival,
      payday_week: plan.context.payday_week,
      items: plan.lines.map((l) => ({
        name: lang === "ml" ? l.item.name_ml : l.item.name_en,
        quantity: l.chosen_qty,
        unit: l.item.unit,
        changed_by_vendor: l.overridden,
        reasons: l.reason_codes.slice(0, 2).map((c) => REASON[c] ?? c),
      })),
    };

    let res: Response;
    try {
      res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${requireEnv("GROQ_API_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.4,
          max_tokens: 1200,
          reasoning_effort: "low",
          messages: [
            { role: "system", content: `${SYSTEM}\nLanguage: ${lang === "ml" ? "Malayalam" : "English"}.` },
            { role: "user", content: `PLAN DATA (JSON):\n${JSON.stringify(data)}` },
          ],
        }),
        signal: AbortSignal.timeout(25_000),
      });
    } catch (e) {
      if (e instanceof AppError) throw e;
      console.error("[plan-voice] request failed", e);
      throw new AppError(502, "INTERNAL", "Summary is unavailable");
    }
    if (!res.ok) {
      console.error("[plan-voice] model error", res.status);
      throw new AppError(502, "INTERNAL", "Summary is unavailable");
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content?.replace(/[*#`_]/g, "").trim();
    if (!text) throw new AppError(502, "INTERNAL", "Summary is unavailable");
    return { text, for_date: plan.for_date, generated_at: plan.generated_at };
  },
};
