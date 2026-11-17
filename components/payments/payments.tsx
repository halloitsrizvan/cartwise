"use client";
import { Banknote, QrCode, Receipt } from "lucide-react";
import { useState } from "react";
import { Card, Chip, EmptyState, ErrorState, ListSkeleton, PageTitle } from "@/components/cw/ui";
import { ItemEmoji, StatCard } from "@/components/cw/widgets";
import { usePayments } from "@/lib/api/hooks";
import type { PaymentBill } from "@/lib/api/types";
import { fmtQty, rupee } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const RANGES = [7, 30, 90] as const;

function MethodChip({ bill }: { bill: PaymentBill }) {
  const { t } = useI18n();
  if (bill.legacy) return <Chip tone="muted">{t("payments.earlier")}</Chip>;
  return bill.method === "upi" ? (
    <Chip tone="soft"><QrCode className="size-4" aria-hidden /> UPI</Chip>
  ) : (
    <Chip tone="accent"><Banknote className="size-4" aria-hidden /> {t("payments.cash")}</Chip>
  );
}

function BillCard({ bill }: { bill: PaymentBill }) {
  const { t, lang } = useI18n();
  const time = bill.legacy ? "" : new Date(bill.ts).toLocaleTimeString(lang === "ml" ? "ml-IN" : "en-IN", { hour: "2-digit", minute: "2-digit" });
  return (
    <Card className="space-y-3 !p-4" data-testid="bill-card">
      <div className="flex flex-wrap items-center gap-2">
        <MethodChip bill={bill} />
        {time && <span className="num text-sm text-muted">{time}</span>}
        <span className="num ml-auto text-2xl font-extrabold text-primary">{rupee(bill.total)}</span>
      </div>
      <ul className="space-y-1.5">
        {bill.lines.map((l) => (
          <li key={`${l.item_id}-${l.price}`} className="flex items-center gap-3">
            <ItemEmoji emoji={l.emoji} name={l.name_en} className="text-2xl" />
            <span className="min-w-0 flex-1 truncate font-semibold">{lang === "ml" ? l.name_ml : l.name_en}</span>
            <span className="num text-sm text-muted">{fmtQty(l.qty)} {t(`unit.${l.unit}`)} × {rupee(l.price)}</span>
            <span className="num w-20 text-right font-bold">{rupee(l.amount)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function PaymentsScreen() {
  const { t, lang } = useI18n();
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const q = usePayments(range);
  const fmtDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(lang === "ml" ? "ml-IN" : "en-IN", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div className="space-y-4">
      <PageTitle sub={t("payments.sub")}>{t("payments.title")}</PageTitle>
      <div role="tablist" className="grid grid-cols-3 gap-2 rounded-full bg-surface-2 p-1">
        {RANGES.map((r) => (
          <button key={r} role="tab" aria-selected={range === r} type="button" onClick={() => setRange(r)} className={cn("btn-press min-h-12 rounded-full font-semibold", range === r && "bg-primary text-on-primary")}>
            {t("payments.days", { n: r })}
          </button>
        ))}
      </div>

      {q.isPending ? (
        <ListSkeleton rows={3} h="h-32" />
      ) : q.isError || !q.data ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : q.data.days.length === 0 ? (
        <EmptyState icon={<Receipt className="size-12" aria-hidden />} title={t("payments.empty")} body={t("payments.empty_body")} />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label={t("payments.total")} value={<span className="text-3xl">{rupee(q.data.totals.total)}</span>} tone="primary" />
            <StatCard label={t("payments.cash")} value={<span className="text-3xl">{rupee(q.data.totals.cash)}</span>} />
            <StatCard label="UPI" value={<span className="text-3xl">{rupee(q.data.totals.upi)}</span>} />
          </div>
          {q.data.days.map((d) => (
            <section key={d.date} aria-label={fmtDay(d.date)}>
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h2 className="text-xl">{fmtDay(d.date)}</h2>
                <span className="num font-bold text-muted">{rupee(d.total)}</span>
              </div>
              <ul className="space-y-3">
                {d.bills.map((b) => (
                  <li key={b.id}><BillCard bill={b} /></li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
