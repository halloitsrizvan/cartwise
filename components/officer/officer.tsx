"use client";
import { useQueryClient } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { BottomSheet } from "@/components/cw/sheet";
import { Button, ButtonLink, Card, Chip, EmptyState, ErrorState, Field, Input, ListSkeleton, PageTitle } from "@/components/cw/ui";
import { StatCard } from "@/components/cw/widgets";
import { StatusSelect } from "@/components/officer/status-select";
import { officer, patch, post } from "@/lib/api/hooks";
import { rupee } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export const th = "px-3 py-3 text-left text-sm font-semibold text-muted";
export const td = "px-3 py-3 align-middle";

export function OfficerOverview() {
  const { t } = useI18n();
  const q = officer.useOverview();
  if (q.isPending) return <ListSkeleton rows={3} h="h-32" />;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  const d = q.data;
  return (
    <div className="space-y-4">
      <PageTitle sub={d.demo ? t("common.seeded_tag") : undefined}>{t("officer.title")}</PageTitle>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("officer.kpi_active")} value={`${d.kpis.active_vendors}/${d.kpis.total_vendors}`} />
        <StatCard label={t("officer.kpi_waste")} value={`${d.kpis.avg_waste_reduction_pts} ${t("officer.kpi_waste_unit")}`} tone="primary" />
        <StatCard label={t("officer.kpi_income")} value={rupee(d.kpis.avg_daily_income)} />
        <StatCard label={t("officer.kpi_ready")} value={d.kpis.ready_vendors} tone="accent" />
      </div>
      <Card>
        <h2 className="mb-3 text-xl">{t("officer.trend")}</h2>
        <div className="h-64" role="img" aria-label={t("officer.trend")}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={d.trend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(v: string) => v.slice(5)} tick={{ fill: "var(--muted)", fontSize: 12 }} interval={3} />
              <YAxis domain={[0, "dataMax"]} tick={{ fill: "var(--muted)", fontSize: 12 }} unit="%" width={44} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }} />
              <Line type="monotone" dataKey="avg_waste_pct" stroke="var(--primary)" strokeWidth={3} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="overflow-x-auto">
        <h2 className="mb-2 text-xl">{t("officer.area")}</h2>
        <table className="w-full min-w-[420px]">
          <thead><tr><th className={th}>{t("officer.col_area")}</th><th className={th}>{t("officer.vendors_n", { n: "" })}</th><th className={th}>{t("officer.col_profit")}</th><th className={th}>{t("officer.kpi_waste")} %</th></tr></thead>
          <tbody>
            {d.area_breakdown.map((a) => (
              <tr key={a.area} className="border-t-[length:var(--bw)] border-line">
                <td className={td}>{a.area}</td><td className={`${td} num`}>{a.vendors}</td><td className={`${td} num`}>{rupee(a.avg_daily_profit)}</td><td className={`${td} num`}>{a.avg_waste_pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="flex flex-wrap items-center gap-3">
        <ButtonLink href="/api/v1/officer/export.csv" variant="primary" download><Download className="size-5" aria-hidden /> {t("officer.export")}</ButtonLink>
        <p className="text-muted">{t("officer.export_note")}</p>
      </div>
    </div>
  );
}

export function OfficerNotices() {
  const { t, lang } = useI18n();
  const q = officer.useNotices();
  const qc = useQueryClient();
  const empty = { title_ml: "", title_en: "", body_ml: "", body_en: "", scheme_tag: "pm_svanidhi", area_filter: "" };
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const publish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.title_ml.trim() || !f.title_en.trim() || !f.body_ml.trim() || !f.body_en.trim() || !f.scheme_tag.trim()) return setErr(t("err.REQUIRED"));
    setErr("");
    setBusy(true);
    try {
      await post("/api/v1/officer/notices", { ...f, area_filter: f.area_filter.trim() || null });
      toast(t("officer.published"));
      setF(empty);
      qc.invalidateQueries({ queryKey: ["o-notices"] });
    } catch {
      setErr(t("common.error_body"));
    }
    setBusy(false);
  };

  const ta = "min-h-28 w-full rounded-[16px] border-[length:var(--bw)] border-line bg-surface p-3 text-lg";
  return (
    <div className="space-y-4">
      <PageTitle>{t("officer.nav.notices")}</PageTitle>
      <Card>
        <h2 className="mb-3 text-xl">{t("officer.notice_new")}</h2>
        <form onSubmit={publish} className="grid gap-4 md:grid-cols-2" noValidate>
          <Field label={t("officer.notice_title_ml")} htmlFor="tml"><Input id="tml" value={f.title_ml} onChange={set("title_ml")} /></Field>
          <Field label={t("officer.notice_title_en")} htmlFor="ten"><Input id="ten" value={f.title_en} onChange={set("title_en")} /></Field>
          <Field label={t("officer.notice_body_ml")} htmlFor="bml"><textarea id="bml" className={ta} value={f.body_ml} onChange={set("body_ml")} /></Field>
          <Field label={t("officer.notice_body_en")} htmlFor="ben"><textarea id="ben" className={ta} value={f.body_en} onChange={set("body_en")} /></Field>
          <Field label={t("officer.scheme_tag")} htmlFor="tag"><Input id="tag" value={f.scheme_tag} onChange={set("scheme_tag")} /></Field>
          <Field label={t("officer.area_filter")} htmlFor="af"><Input id="af" value={f.area_filter} onChange={set("area_filter")} /></Field>
          {err && <p role="alert" className="font-medium text-danger md:col-span-2">{err}</p>}
          <div className="md:col-span-2"><Button type="submit" size="lg" loading={busy}>{t("officer.publish")}</Button></div>
        </form>
      </Card>
      {q.isPending ? <ListSkeleton rows={3} h="h-24" /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : !q.data.length ? <EmptyState title={t("notices.empty")} /> : (
        <ul className="space-y-3">
          {q.data.map((n) => (
            <li key={n.id} className="card flex flex-wrap items-center gap-3 p-4">
              <Chip>{n.scheme_tag}</Chip>
              <span className="min-w-0 flex-1 font-semibold">{lang === "ml" ? n.title_ml : n.title_en}</span>
              {n.area_filter && <Chip tone="muted">{n.area_filter}</Chip>}
              <span className="num text-sm text-muted">{n.published_at.slice(0, 10)}</span>
              <Chip tone="accent">{t("officer.read_count", { n: n.read_count ?? 0 })}</Chip>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function OfficerRegistrations() {
  const { t } = useI18n();
  const q = officer.useVendors();
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const rows = (q.data ?? []).filter((v) => `${v.name} ${v.area}`.toLowerCase().includes(filter.toLowerCase()));
  return (
    <div className="space-y-4">
      <PageTitle sub={t("officer.simulated")}>{t("officer.nav.registrations")}</PageTitle>
      <Input aria-label={t("officer.filter")} placeholder={t("officer.filter")} value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-md" />
      {q.isPending ? <ListSkeleton rows={4} h="h-14" /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : !rows.length ? <EmptyState title={t("officer.markets_empty")} /> : (
        <Card className="overflow-x-auto !p-2">
          <table className="w-full min-w-[720px]">
            <thead><tr><th className={th}>{t("officer.col_name")}</th><th className={th}>{t("officer.col_area")}</th><th className={th}>{t("officer.col_stall")}</th><th className={th}>{t("officer.col_ready")}</th><th className={th}>{t("officer.col_days")}</th><th className={th}>{t("officer.col_profit")}</th><th className={th}>{t("officer.col_status")}</th><th className={th} /></tr></thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.id} className="border-t-[length:var(--bw)] border-line">
                  <td className={`${td} font-semibold`}>{v.name}</td>
                  <td className={td}>{v.area}</td>
                  <td className={td}>{t(`stall.${v.stall_type}`)}</td>
                  <td className={td}><div className="flex items-center gap-2"><div className="h-2.5 w-24 rounded-full bg-surface-2" aria-hidden><div className="h-full rounded-full bg-primary" style={{ width: `${v.readiness_percent}%` }} /></div><span className="num font-semibold">{v.readiness_percent}%</span></div></td>
                  <td className={`${td} num`}>{v.logged_days}</td>
                  <td className={`${td} num`}>{rupee(v.avg_daily_profit)}</td>
                  <td className={td}><Chip tone={v.registration_status === "approved" ? "soft" : "muted"}>{t(`officer.status_${v.registration_status}`)}</Chip></td>
                  <td className={td}><Button size="sm" variant="soft" onClick={() => setOpen(v.id)}>{t("officer.open")}</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <SummarySheet id={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function SummarySheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { t } = useI18n();
  const q = officer.useSummary(id);
  const qc = useQueryClient();
  const setStatus = async (status: string) => {
    if (!q.data) return;
    await patch(`/api/v1/officer/registrations/${q.data.registration_id}`, { status });
    toast(t("settings.saved"));
    qc.invalidateQueries({ queryKey: ["o-summary", id] });
    qc.invalidateQueries({ queryKey: ["o-vendors"] });
  };
  return (
    <BottomSheet open={!!id} onClose={onClose} title={t("officer.app_summary")}>
      {q.isPending ? <ListSkeleton rows={2} h="h-24" /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : (
        <div className="space-y-4">
          <p className="card-2 p-3 font-semibold">{t("officer.simulated")}</p>
          <section><h3 className="text-lg text-muted">{t("officer.applicant")}</h3>
            <p className="text-xl font-bold">{q.data.applicant.name}</p>
            <p>{q.data.applicant.phone} · {q.data.applicant.area} · {t(`stall.${q.data.applicant.stall_type}`)}</p></section>
          <section><h3 className="text-lg text-muted">{t("officer.income")}</h3>
            <p className="num text-3xl font-extrabold text-primary">{rupee(q.data.income.avg_daily_profit)}</p>
            <p className="num">{q.data.income.logged_days} {t("common.days")} · {Math.round(q.data.income.closed_ratio * 100)}% · {t(`consistency.${q.data.income.consistency}`)}</p></section>
          <section><h3 className="text-lg text-muted">{t("passport.readiness")} ({q.data.readiness.percent}%)</h3>
            <ul className="space-y-1">{q.data.readiness.items.map((i) => <li key={i.key} className="flex gap-2"><span aria-hidden>{i.passed ? "✅" : "⬜"}</span><span>{t(`passport.item.${i.key}`)}</span></li>)}</ul>
            <p className="mt-1 text-sm text-muted">{t("passport.indicative")}</p></section>
          <section><h3 className="mb-1 text-lg text-muted">{t("officer.status")}</h3>
            <StatusSelect value={q.data.status} onChange={setStatus} /></section>
        </div>
      )}
    </BottomSheet>
  );
}

export function OfficerMarkets() {
  const { t } = useI18n();
  const q = officer.useMarkets();
  const qc = useQueryClient();
  const decide = async (id: string, approved: boolean) => {
    await patch(`/api/v1/officer/markets/${id}/approve`, { approved });
    qc.invalidateQueries({ queryKey: ["o-markets"] });
  };
  return (
    <div className="space-y-4">
      <PageTitle>{t("officer.nav.markets")}</PageTitle>
      {q.isPending ? <ListSkeleton rows={3} h="h-20" /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : !q.data.length ? <EmptyState title={t("officer.markets_empty")} /> : (
        <ul className="space-y-3">
          {q.data.map((m) => (
            <li key={m.id} className="card flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1"><p className="text-xl font-bold">{m.market_name}</p><p className="text-muted">{m.area} · {m.email}</p></div>
              <Chip tone={m.approved ? "soft" : "accent"}>{m.approved ? t("officer.market_approved") : t("officer.market_pending")}</Chip>
              {m.approved ? <Button size="sm" variant="outline" onClick={() => decide(m.id, false)}>{t("officer.market_reject")}</Button> : <><Button size="sm" onClick={() => decide(m.id, true)} data-testid={`approve-${m.id}`}>{t("officer.market_approve")}</Button><Button size="sm" variant="outline" onClick={() => decide(m.id, false)}>{t("officer.market_reject")}</Button></>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
