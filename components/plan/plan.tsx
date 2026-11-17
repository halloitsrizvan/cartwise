"use client";
import { useQueryClient } from "@tanstack/react-query";
import { CloudRain, PartyPopper, Play, Square, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button, ButtonLink, Card, EmptyState, ErrorState, ListSkeleton } from "@/components/cw/ui";
import { ConfidenceDots, CountUp, ItemEmoji, RangeBar, ReasonChip, Stepper } from "@/components/cw/widgets";
import { api } from "@/lib/api/client";
import { cacheGet, cacheSet } from "@/lib/offline/db";
import { post, usePlan } from "@/lib/api/hooks";
import type { PlanView, PlanViewLine } from "@/lib/api/types";
import { fmtQty } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

const CTX = [
  { key: "rain", icon: CloudRain, label: "plan.ctx_rain" },
  { key: "festival", icon: PartyPopper, label: "plan.ctx_festival" },
  { key: "payday_week", icon: Wallet, label: "plan.ctx_payday" },
] as const;

function usePlanFor(day: "tomorrow" | "today") {
  const tomorrow = usePlan();
  const today = useQuery({
    queryKey: ["plan-today"],
    enabled: day === "today",
    queryFn: async () => {
      try {
        const d = await api<PlanView>("/api/v1/plan/today");
        void cacheSet("/api/v1/plan/today", d);
        return d;
      } catch (e) {
        const c = await cacheGet<PlanView>("/api/v1/plan/today");
        if (c) return c;
        throw e;
      }
    },
  });
  return day === "today" ? today : tomorrow;
}

function speak(text: string, onEnd: () => void): boolean {
  if (typeof speechSynthesis === "undefined") return false;
  const voices = speechSynthesis.getVoices();
  const v = voices.find((x) => x.lang.toLowerCase().startsWith("ml"));
  if (!v) return false;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = v;
  u.lang = v.lang;
  u.onend = onEnd;
  u.onerror = onEnd;
  speechSynthesis.speak(u);
  return true;
}

export function PlanScreen({ day = "tomorrow" }: { day?: "tomorrow" | "today" }) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const q = usePlanFor(day);
  const [local, setLocal] = useState<Record<string, number>>({});
  const [playing, setPlaying] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    setLocal({});
  }, [q.data?.generated_at]);
  useEffect(() => () => {
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  }, []);

  if (q.isPending) return <ListSkeleton rows={4} h="h-48" />;
  if (q.isError || !q.data) return <ErrorState onRetry={() => q.refetch()} />;
  const plan = q.data;
  if (!plan.lines.length) return <EmptyState title={t("plan.empty")} body={t("plan.empty_body")} action={<ButtonLink href="/app/settings">{t("more.settings")}</ButtonLink>} />;

  const qty = (l: PlanViewLine) => local[l.item_id] ?? l.chosen_qty;
  const spend = Math.round(plan.lines.reduce((s, l) => s + qty(l) * l.item.buy_price, 0));
  const profit = Math.round(
    plan.lines.reduce((s, l) => {
      if (local[l.item_id] === undefined) return s + l.effective_profit;
      const demand = l.demand ?? l.expected_sales;
      const sales = Math.min(demand, local[l.item_id]);
      return s + sales * (l.item.sell_price - l.item.buy_price) - Math.max(local[l.item_id] - sales, 0) * l.item.buy_price;
    }, 0),
  );

  const override = (l: PlanViewLine, v: number) => {
    setLocal((s) => ({ ...s, [l.item_id]: v }));
    if (day !== "tomorrow") return;
    clearTimeout(timers.current[l.item_id]);
    timers.current[l.item_id] = setTimeout(async () => {
      try {
        const res = await post<PlanView>("/api/v1/plan/override", { item_id: l.item_id, chosen_qty: v });
        qc.setQueryData(["plan"], res);
        void cacheSet("/api/v1/plan/tomorrow", res);
      } catch {
        toast.error(t("common.error_body"));
      }
    }, 450);
  };

  const toggleCtx = async (key: (typeof CTX)[number]["key"]) => {
    const next = !plan.context[key];
    qc.setQueryData<PlanView>(["plan"], { ...plan, context: { ...plan.context, [key]: next } });
    try {
      const res = await api<PlanView>("/api/v1/day/context?for=tomorrow", { method: "PATCH", body: { [key]: next } });
      qc.setQueryData(["plan"], res);
    } catch {
      qc.invalidateQueries({ queryKey: ["plan"] });
      toast.error(t("common.error_body"));
    }
  };

  const play = () => {
    if (playing) {
      speechSynthesis.cancel();
      setPlaying(false);
      return;
    }
    const text = [t("plan.speak_intro"), ...plan.lines.map((l) => t("plan.speak_line", { name: l.item.name_ml, qty: fmtQty(qty(l)), unit: t(`unit.${l.item.unit}`) }))].join(" ");
    const ok = speak(text, () => setPlaying(false));
    if (ok) setPlaying(true);
    else toast(t("plan.no_voice"));
  };

  const title = day === "today" ? t("plan.today_title") : t("plan.title", { day: t(`wd.${plan.weekday}`) });

  return (
    <div className="pb-28">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl" data-testid="plan-title">{title}</h1>
          <p className="text-muted">{t("plan.hint")}</p>
        </div>
        <Button variant={playing ? "danger" : "soft"} size="sm" onClick={play} aria-label={playing ? t("plan.stop") : t("plan.play")} data-testid="plan-play">
          {playing ? <Square className="size-5" aria-hidden /> : <Play className="size-5" aria-hidden />}
          {playing ? t("plan.stop") : t("plan.play")}
        </Button>
      </div>

      {day === "tomorrow" && (
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label={t("today.context")}>
          {CTX.map((c) => (
            <button key={c.key} type="button" role="switch" aria-checked={plan.context[c.key]} onClick={() => toggleCtx(c.key)} className={cn("btn-press inline-flex min-h-12 items-center gap-2 rounded-full border-[length:var(--bw)] px-4 font-semibold", plan.context[c.key] ? "border-primary bg-primary text-on-primary" : "border-line bg-surface")}>
              <c.icon className="size-5" aria-hidden /> {t(c.label)}
            </button>
          ))}
        </div>
      )}

      <Card className="mb-4 !bg-primary text-center !text-on-primary">
        <p className="text-lg font-semibold opacity-90">{t("plan.expected")}</p>
        <CountUp value={profit} prefix="₹" className="text-6xl font-extrabold" />
      </Card>

      <ul className="space-y-4" data-testid="plan-list">
        {plan.lines.map((l) => {
          const name = lang === "ml" ? l.item.name_ml : l.item.name_en;
          const changed = local[l.item_id] !== undefined ? local[l.item_id] !== l.recommended : l.overridden;
          return (
            <li key={l.item_id}>
              <Card className="space-y-3" data-testid={`plan-item-${l.item.category_slug}`}>
                <div className="flex items-center gap-3">
                  <ItemEmoji emoji={l.item.emoji} name={l.item.name_en} className="text-5xl" />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl">{name}</h2>
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <ConfidenceDots level={l.confidence} />
                      <span className="num">{t("plan.range", { low: fmtQty(l.low), high: fmtQty(l.high) })}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-muted">{t("plan.recommended")}</p>
                    <p className="num text-6xl font-extrabold leading-none text-primary" data-testid="rec-qty">{fmtQty(qty(l))}</p>
                    <p className="text-base text-muted">{t(`unit.${l.item.unit}`)}</p>
                  </div>
                </div>
                <RangeBar low={l.low} high={l.high} rec={qty(l)} />
                <div className="flex flex-wrap gap-2">
                  {l.reason_codes.slice(0, 2).map((c) => <ReasonChip key={c} code={c} />)}
                  {changed && <span className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-sm font-semibold text-on-accent">{t("plan.changed")}</span>}
                </div>
                <Stepper value={qty(l)} onChange={(v) => override(l, v)} step={l.item.unit_step} label={`${t("plan.override")}: ${name}`} unit={t(`unit.${l.item.unit}`)} />
              </Card>
            </li>
          );
        })}
      </ul>

      <div className="dock-bar" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
        <div className="card mx-auto max-w-2xl px-5 py-3 text-center text-lg font-bold" data-testid="plan-total">
          {t("plan.spend_profit", { spend: spend.toLocaleString("en-IN"), profit: profit.toLocaleString("en-IN") })}
        </div>
      </div>
    </div>
  );
}
