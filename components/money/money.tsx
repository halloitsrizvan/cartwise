"use client";
import { useState } from "react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { ButtonLink, Card, Chip, EmptyState, ErrorState, ListSkeleton, PageTitle } from "@/components/cw/ui";
import { CountUp, StatCard } from "@/components/cw/widgets";
import { useBeforeAfter, useMoney } from "@/lib/api/hooks";
import type { BeforeAfter, GroupStats } from "@/lib/api/types";
import { pct, rupee } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function ProfitChart({ days }: { days: { date: string; profit: number; followed: boolean }[] }) {
  const { t } = useI18n();
  const data = days.map((d) => ({ ...d, label: d.date.slice(8), v: Math.max(0, d.profit) }));
  const showLabels = data.length <= 10;
  return (
    <div>
      <div className="h-56 w-full" role="img" aria-label={t("money.chart")}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 22, right: 4, left: 4, bottom: 0 }}>
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--border)" }} tick={{ fill: "var(--muted)", fontSize: 12 }} interval={data.length > 10 ? 3 : 0} />
            <YAxis hide domain={[0, "dataMax"]} />
            <Bar dataKey="v" radius={[8, 8, 0, 0]} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.date} fill={d.followed ? "var(--primary)" : "var(--gut)"} />
              ))}
              {showLabels && <LabelList dataKey="v" position="top" formatter={(v) => String(v)} style={{ fill: "var(--ink)", fontSize: 12, fontWeight: 700 }} />}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex gap-4 text-sm font-semibold">
        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-sm bg-primary" /> {t("money.followed_legend")}</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-sm bg-gut" /> {t("money.gut_legend")}</span>
      </div>
    </div>
  );
}

function Pair({ label, before, after, fmt, lowerIsBetter }: { label: string; before: number; after: number; fmt: (n: number) => string; lowerIsBetter?: boolean }) {
  const better = lowerIsBetter ? after < before : after > before;
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-t-[length:var(--bw)] border-line py-3 first:border-0">
      <span className="font-semibold">{label}</span>
      <span className="num rounded-full bg-gut/25 px-3 py-1 text-lg font-bold">{fmt(before)}</span>
      <span className={cn("num rounded-full px-3 py-1 text-lg font-bold", better ? "bg-primary text-on-primary" : "bg-surface-2")}>{fmt(after)}</span>
    </div>
  );
}

function BeforeAfterCard({ d }: { d: BeforeAfter }) {
  const { t } = useI18n();
  if (d.mode === "none") {
    return (
      <Card>
        <h2 className="mb-2 text-2xl">{t("money.ba_title")}</h2>
        <p className="text-muted">{t("money.ba_none")}</p>
      </Card>
    );
  }
  const bl = d.mode === "followed" ? t("money.ba_gut") : t("money.ba_first7");
  const al = d.mode === "followed" ? t("money.ba_followed") : t("money.ba_after7");
  const g = (s: GroupStats) => t("money.ba_days", { n: s.days });
  return (
    <Card data-testid="before-after">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl">{t("money.ba_title")}</h2>
        {d.demo && <Chip tone="accent">{t("common.seeded_tag")}</Chip>}
      </div>
      <div className="grid grid-cols-[1fr_auto_auto] gap-3 text-sm font-semibold text-muted">
        <span />
        <span className="w-24 text-center">{bl}<br />{g(d.before)}</span>
        <span className="w-24 text-center text-primary">{al}<br />{g(d.after)}</span>
      </div>
      <Pair label={t("money.ba_waste")} before={d.before.avgWastePct} after={d.after.avgWastePct} fmt={pct} lowerIsBetter />
      <Pair label={t("money.ba_profit")} before={d.before.avgProfit} after={d.after.avgProfit} fmt={rupee} />
      <Pair label={t("money.ba_soldout")} before={d.before.soldOutRate} after={d.after.soldOutRate} fmt={pct} lowerIsBetter />
    </Card>
  );
}

export function MoneyScreen() {
  const { t } = useI18n();
  const [range, setRange] = useState<7 | 30>(7);
  const m = useMoney(range);
  const ba = useBeforeAfter();

  return (
    <div className="space-y-4">
      <PageTitle>{t("money.title")}</PageTitle>
      <div role="tablist" className="grid grid-cols-2 gap-2 rounded-full bg-surface-2 p-1">
        {([7, 30] as const).map((r) => (
          <button key={r} role="tab" aria-selected={range === r} type="button" onClick={() => setRange(r)} className={cn("btn-press min-h-12 rounded-full font-semibold", range === r && "bg-primary text-on-primary")}>
            {r === 7 ? t("money.week") : t("money.month")}
          </button>
        ))}
      </div>

      {m.isPending ? (
        <ListSkeleton rows={2} h="h-44" />
      ) : m.isError || !m.data ? (
        <ErrorState onRetry={() => m.refetch()} />
      ) : m.data.days.length === 0 ? (
        <EmptyState title={t("money.empty")} body={t("money.empty_body")} action={<ButtonLink href="/app/close">{t("today.close_day")}</ButtonLink>} />
      ) : (
        <>
          <Card>
            <p className="text-lg font-semibold text-muted">{t("money.profit")}</p>
            <CountUp value={m.data.totals.profit} prefix="₹" className="text-6xl font-extrabold text-primary" />
            <p className="mb-3 text-muted">{t("money.avg", { n: rupee(m.data.totals.avg_profit) })}</p>
            <ProfitChart days={m.data.days} />
          </Card>
          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard label={t("money.waste_card")} value={<span className="text-danger">{rupee(m.data.totals.waste_value)}</span>} sub={t("money.waste_sub")} />
            <StatCard label={t("money.missed_card")} value={rupee(m.data.totals.missed_sales)} sub={t("money.missed_sub")} />
          </div>
        </>
      )}

      {ba.isPending ? <ListSkeleton rows={1} h="h-56" /> : ba.data ? <BeforeAfterCard d={ba.data} /> : null}
    </div>
  );
}
