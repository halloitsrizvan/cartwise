"use client";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button, ButtonLink, Card, EmptyState, ErrorState, Field, Input, ListSkeleton, Toggle } from "@/components/cw/ui";
import { CountUp, ItemEmoji, Stepper, SuccessCheck } from "@/components/cw/widgets";
import { api } from "@/lib/api/client";
import type { PlanView } from "@/lib/api/types";
import { fmtQty, rupee } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { enqueue, useSyncState } from "@/lib/offline/queue";
import { useLiveToday } from "@/lib/sales";
import { dayMetrics } from "@/server/services/money";

type Row = { bought: number; leftover: number; soldOut: boolean; at: string };

export function CloseDay() {
  const { t, lang } = useI18n();
  const live = useLiveToday();
  const sync = useSyncState();
  // today's plan prefills "bought" (the vendor usually bought what the plan said)
  const plan = useQuery({ queryKey: ["plan-today"], queryFn: () => api<PlanView>("/api/v1/plan/today").catch(() => null), staleTime: 60_000 });
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [step, setStep] = useState(0);
  const [cost, setCost] = useState<number | null>(null);
  const [result, setResult] = useState<ReturnType<typeof dayMetrics> | null>(null);
  const [busy, setBusy] = useState(false);

  const items = live.items;
  useEffect(() => {
    if (!items.length) return;
    setRows((prev) => {
      const next = { ...prev };
      for (const it of items) {
        if (!next[it.id]) {
          const rec = plan.data?.lines.find((l) => l.item_id === it.id)?.chosen_qty ?? it.sold_qty;
          next[it.id] = { bought: Math.max(rec, it.sold_qty), leftover: 0, soldOut: false, at: "" };
        }
      }
      return next;
    });
  }, [items, plan.data]);

  const suggestedCost = useMemo(() => Math.round(items.reduce((s, it) => s + (rows[it.id]?.bought ?? 0) * it.buy_price, 0)), [items, rows]);

  if (live.isPending) return <ListSkeleton rows={3} h="h-40" />;
  if (live.isError) return <ErrorState onRetry={() => live.refetch()} />;
  if (!items.length) return <EmptyState title={t("sell.empty")} action={<ButtonLink href="/app/settings">{t("more.settings")}</ButtonLink>} />;
  if (live.closed && !result) return <EmptyState title={t("close.already")} action={<ButtonLink href="/app/plan">{t("today.see_plan")}</ButtonLink>} />;

  const total = items.length;
  const onCost = step === total;
  const item = items[step];
  const row = item ? rows[item.id] : undefined;
  const set = (id: string, patch: Partial<Row>) => setRows((r) => ({ ...r, [id]: { ...r[id], ...patch } }));

  const submit = async () => {
    const purchase = cost ?? suggestedCost;
    setBusy(true);
    const payload = {
      items: items.map((it) => ({
        item_id: it.id,
        bought_qty: rows[it.id].bought,
        leftover_qty: rows[it.id].leftover,
        sold_out: rows[it.id].soldOut,
        ...(rows[it.id].soldOut && rows[it.id].at ? { sold_out_at: rows[it.id].at } : {}),
      })),
      purchase_cost: purchase,
    };
    const m = dayMetrics(
      items.map((it) => ({ boughtQty: rows[it.id].bought, soldQty: it.sold_qty, leftoverQty: rows[it.id].leftover, soldOut: rows[it.id].soldOut, buyPrice: it.buy_price, sellPrice: it.sell_price })),
      purchase,
    );
    await enqueue({ kind: "close", payload }); // optimistic + offline-safe; synced with retry
    setResult(m);
    setBusy(false);
  };

  if (result) {
    const offline = !sync.online || sync.pending > 0;
    return (
      <div className="space-y-4 text-center">
        <div className="flex justify-center pt-4"><SuccessCheck /></div>
        <h1 className="text-3xl">{t("close.done_title")}</h1>
        <Card className="space-y-4 text-left">
          <p className="text-lg font-semibold text-muted">{t("close.summary")}</p>
          <div><p className="text-muted">{t("close.profit")}</p><CountUp value={result.profit} prefix="₹" className="text-5xl font-extrabold text-primary" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-muted">{t("close.revenue")}</p><CountUp value={result.revenue} prefix="₹" className="text-2xl font-bold" /></div>
            <div><p className="text-muted">{t("close.waste")}</p><CountUp value={result.wasteValue} prefix="₹" className="text-2xl font-bold text-danger" /></div>
            <div className="col-span-2"><p className="text-muted">{t("close.missed")}</p><CountUp value={result.missedSales} prefix="₹" className="text-2xl font-bold" /></div>
          </div>
        </Card>
        {offline && <p className="card-2 p-3 font-medium" role="status">{t("close.saved_offline")}</p>}
        <ButtonLink href="/app/plan" size="lg" className="w-full" data-testid="see-plan">{t("today.see_plan")}</ButtonLink>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {step > 0 && (
          <button type="button" onClick={() => setStep(step - 1)} aria-label={t("common.back")} className="btn-press tap-target grid place-items-center rounded-full hover:bg-surface-2">
            <ChevronLeft className="size-7" aria-hidden />
          </button>
        )}
        <h1 className="text-2xl">{t("close.title")}</h1>
        <span className="num ml-auto text-muted">{Math.min(step + 1, total + 1)} / {total + 1}</span>
      </div>
      <div className="flex gap-1.5" aria-hidden>
        {Array.from({ length: total + 1 }).map((_, i) => (
          <span key={i} className={`h-2 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-line"}`} />
        ))}
      </div>

      {!onCost && item && row && (
        <Card className="space-y-5" data-testid="close-card">
          <div className="flex items-center gap-3">
            <ItemEmoji emoji={item.emoji} name={item.name_en} className="text-6xl" />
            <div>
              <h2 className="text-2xl">{lang === "ml" ? item.name_ml : item.name_en}</h2>
              <p className="text-muted">{t("close.item_of", { i: step + 1, n: total })} · {t("close.sold")}: <span className="num font-bold text-ink">{fmtQty(item.sold_qty)} {t(`unit.${item.unit}`)}</span></p>
            </div>
          </div>
          <div>
            <p className="mb-2 text-lg font-semibold">{t("close.bought")}</p>
            <Stepper value={row.bought} onChange={(v) => set(item.id, { bought: v })} step={item.unit_step} label={t("close.bought")} unit={t(`unit.${item.unit}`)} />
          </div>
          <div>
            <p className="mb-2 text-lg font-semibold">{t("close.leftover")}</p>
            <Stepper value={row.leftover} onChange={(v) => set(item.id, { leftover: v })} step={item.unit_step} label={t("close.leftover")} unit={t(`unit.${item.unit}`)} />
          </div>
          <div className="flex items-center justify-between gap-3 border-t-[length:var(--bw)] border-line pt-4">
            <label htmlFor="sold-out" className="text-lg font-semibold">{t("close.sold_out")}</label>
            <Toggle id="sold-out" checked={row.soldOut} onChange={(v) => set(item.id, { soldOut: v })} label={t("close.sold_out")} />
          </div>
          {row.soldOut && (
            <Field label={t("close.sold_out_at")} htmlFor="sold-at">
              <Input id="sold-at" type="time" value={row.at} onChange={(e) => set(item.id, { at: e.target.value })} />
            </Field>
          )}
        </Card>
      )}

      {onCost && (
        <Card className="space-y-4">
          <h2 className="text-2xl">{t("close.cost_title")}</h2>
          <p className="text-muted">{t("close.cost_hint")}</p>
          <Field label={t("close.cost_label")} htmlFor="cost">
            <Input id="cost" inputMode="numeric" className="num text-3xl font-bold" value={cost ?? suggestedCost} onChange={(e) => setCost(Number(e.target.value.replace(/\D/g, "")) || 0)} data-testid="cost-input" />
          </Field>
          <p className="text-muted">≈ {rupee(suggestedCost)}</p>
        </Card>
      )}

      <div className="flex gap-3">
        {!onCost ? (
          <Button size="lg" className="flex-1" onClick={() => setStep(step + 1)} data-testid="close-next">{t("common.next")}</Button>
        ) : (
          <Button size="lg" className="flex-1" loading={busy} onClick={submit} data-testid="close-submit">{t("close.review")}</Button>
        )}
      </div>
    </div>
  );
}
