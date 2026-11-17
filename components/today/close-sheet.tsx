"use client";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { BottomSheet } from "@/components/cw/sheet";
import { Button, ButtonLink, ListSkeleton } from "@/components/cw/ui";
import { CountUp, SuccessCheck } from "@/components/cw/widgets";
import { api } from "@/lib/api/client";
import type { PlanView } from "@/lib/api/types";
import { fmtQty, rupee } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { enqueue } from "@/lib/offline/queue";
import { useLiveToday } from "@/lib/sales";
import { dayMetrics, deriveClose } from "@/server/services/money";

/**
 * One-tap close. Nothing to type: bought / leftover / sold-out / cost are derived from today's sales
 * and the plan (same pure function the server uses), so the summary here equals what gets saved.
 */
export function CloseSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang } = useI18n();
  const live = useLiveToday();
  const plan = useQuery({ queryKey: ["plan-today"], queryFn: () => api<PlanView>("/api/v1/plan/today").catch(() => null), staleTime: 60_000, enabled: open });
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const calc = useMemo(() => {
    const planned = new Map((plan.data?.lines ?? []).map((l) => [l.item_id, l.chosen_qty]));
    const hasPlan = (plan.data?.lines.length ?? 0) > 0;
    const rows = live.items.map((i) => ({ itemId: i.id, sold: i.sold_qty, planned: hasPlan ? (planned.get(i.id) ?? null) : null, buyPrice: i.buy_price }));
    const d = deriveClose(rows);
    const m = dayMetrics(
      live.items.map((i, k) => ({ boughtQty: d.items[k].bought_qty, soldQty: i.sold_qty, leftoverQty: d.items[k].leftover_qty, soldOut: d.items[k].sold_out, buyPrice: i.buy_price, sellPrice: i.sell_price })),
      d.purchase_cost,
    );
    return { d, m };
  }, [live.items, plan.data]);

  const confirm = async () => {
    setBusy(true);
    await enqueue({ kind: "close", payload: {} }); // empty body: the server derives the same numbers
    setBusy(false);
    setDone(true);
  };
  const handleClose = () => {
    onClose();
    setTimeout(() => setDone(false), 300);
  };

  const sold = live.items.filter((i) => i.sold_qty > 0);
  const m = calc.m;

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      title={done ? t("close.done_title") : t("close.title")}
      footer={
        done ? (
          <ButtonLink href="/app/plan" size="lg" className="w-full" data-testid="see-plan">{t("today.see_plan")}</ButtonLink>
        ) : (
          <Button size="lg" className="w-full" loading={busy} disabled={live.isPending} onClick={confirm} data-testid="close-submit">{t("close.review")}</Button>
        )
      }
    >
      {live.isPending ? (
        <ListSkeleton rows={2} h="h-24" />
      ) : done ? (
        <div className="space-y-3 text-center">
          <div className="flex justify-center"><SuccessCheck /></div>
          <p className="text-muted">{t("close.profit")}</p>
          <CountUp value={m.profit} prefix="₹" className="text-5xl font-extrabold text-primary" />
          <p className="card-2 p-3 text-sm">{t("close.saved_offline")}</p>
        </div>
      ) : (
        <div className="space-y-4" data-testid="close-summary">
          <p className="text-muted">{t("close.auto_hint")}</p>
          <div>
            <p className="text-muted">{t("close.profit")}</p>
            <CountUp value={m.profit} prefix="₹" className="text-5xl font-extrabold text-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="card-2 p-3"><p className="text-sm text-muted">{t("close.revenue")}</p><p className="num text-xl font-bold">{rupee(m.revenue)}</p></div>
            <div className="card-2 p-3"><p className="text-sm text-muted">{t("close.waste")}</p><p className="num text-xl font-bold text-danger">{rupee(m.wasteValue)}</p></div>
            <div className="card-2 col-span-2 p-3"><p className="text-sm text-muted">{t("close.missed")}</p><p className="num text-xl font-bold">{rupee(m.missedSales)}</p></div>
          </div>
          {sold.length > 0 && (
            <ul className="space-y-1 text-lg">
              {sold.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3">
                  <span className="truncate">{i.emoji} {lang === "ml" ? i.name_ml : i.name_en}</span>
                  <span className="num font-semibold">{fmtQty(i.sold_qty)} {t(`unit.${i.unit}`)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
