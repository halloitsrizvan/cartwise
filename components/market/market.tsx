"use client";
import { useQueryClient } from "@tanstack/react-query";
import { Hourglass } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button, ButtonLink, Card, Chip, EmptyState, ErrorState, Field, Input, ListSkeleton, PageTitle } from "@/components/cw/ui";
import { StatCard } from "@/components/cw/widgets";
import { th, td } from "@/components/officer/officer";
import { market, patch, post } from "@/lib/api/hooks";
import { rupee } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { ALIASES } from "@/shared/voice";

const CATS = Object.keys(ALIASES);
const UNITS = ["kg", "piece", "cup", "bundle"] as const;

function Pending() {
  const { t } = useI18n();
  return <EmptyState icon={<Hourglass className="size-14" aria-hidden />} title={t("market.pending_title")} body={t("market.pending_body")} />;
}

export function MarketOverview() {
  const { t, lang } = useI18n();
  const stats = market.useStats();
  const offers = market.useOffers();
  const qc = useQueryClient();
  const act = async (id: string, status: "expired" | "removed") => {
    await patch(`/api/v1/market/offers/${id}`, { status });
    qc.invalidateQueries({ queryKey: ["m-offers"] });
    qc.invalidateQueries({ queryKey: ["m-stats"] });
  };
  if (stats.isPending) return <ListSkeleton rows={3} h="h-28" />;
  if (stats.isError) return <ErrorState onRetry={() => stats.refetch()} />;
  if (!stats.data.approved) return <div className="space-y-4"><PageTitle>{stats.data.market_name}</PageTitle><Pending /></div>;
  return (
    <div className="space-y-4">
      <PageTitle>{stats.data.market_name}</PageTitle>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label={t("market.kpi_live")} value={stats.data.offers_live} tone="primary" />
        <StatCard label={t("market.kpi_reached")} value={stats.data.vendors_reached} />
        <StatCard label={t("market.kpi_views")} value={stats.data.views} />
      </div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl">{t("market.offers")}</h2>
        <ButtonLink href="/market/new" size="sm">{t("market.nav.create")}</ButtonLink>
      </div>
      {offers.isPending ? <ListSkeleton rows={3} h="h-14" /> : offers.isError ? <ErrorState onRetry={() => offers.refetch()} /> : !offers.data.length ? (
        <EmptyState title={t("market.empty")} body={t("market.empty_body")} action={<ButtonLink href="/market/new">{t("market.nav.create")}</ButtonLink>} />
      ) : (
        <Card className="overflow-x-auto !p-2">
          <table className="w-full min-w-[640px]">
            <thead><tr><th className={th}>{t("market.col_title")}</th><th className={th}>{t("market.col_price")}</th><th className={th}>{t("market.col_status")}</th><th className={th}>{t("market.col_views")}</th><th className={th}>{t("market.col_valid")}</th><th className={th} /></tr></thead>
            <tbody>
              {offers.data.map((o) => (
                <tr key={o.id} className="border-t-[length:var(--bw)] border-line">
                  <td className={`${td} font-semibold`}>{lang === "ml" ? o.title_ml : o.title_en}</td>
                  <td className={`${td} num`}>{rupee(o.price)}/{t(`unit.${o.unit}`)}</td>
                  <td className={td}><Chip tone={o.status === "active" ? "soft" : "muted"}>{t(`market.status_${o.status}`)}</Chip></td>
                  <td className={`${td} num`}>{o.views}</td>
                  <td className={`${td} num`}>{o.valid_to.slice(0, 10)}</td>
                  <td className={td}><div className="flex gap-2">{o.status === "active" && <Button size="sm" variant="outline" onClick={() => act(o.id, "expired")}>{t("market.expire")}</Button>}<Button size="sm" variant="ghost" onClick={() => act(o.id, "removed")}>{t("common.remove")}</Button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

const iso = (d: Date) => d.toISOString().slice(0, 16);

export function MarketCreate() {
  const { t, lang } = useI18n();
  const stats = market.useStats();
  const router = useRouter();
  const qc = useQueryClient();
  const now = new Date();
  const [f, setF] = useState({ category_slug: "mango", title_ml: "", title_en: "", price: "", unit: "kg" as (typeof UNITS)[number], qty_available: "", valid_from: iso(now), valid_to: iso(new Date(now.getTime() + 14 * 86_400_000)), area: "" });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  if (stats.isPending) return <ListSkeleton rows={2} h="h-40" />;
  if (stats.isError) return <ErrorState onRetry={() => stats.refetch()} />;
  if (!stats.data.approved) return <Pending />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    (["title_ml", "title_en", "area"] as const).forEach((k) => !f[k].trim() && (er[k] = t("err.REQUIRED")));
    if (!(Number(f.price) > 0)) er.price = t("err.PRICE_INVALID");
    if (!(Number(f.qty_available) > 0)) er.qty_available = t("err.REQUIRED");
    if (new Date(f.valid_to) <= new Date(f.valid_from)) er.valid_to = t("err.REQUIRED");
    setErrs(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      await post("/api/v1/market/offers", { ...f, price: Number(f.price), qty_available: Number(f.qty_available), valid_from: new Date(f.valid_from).toISOString(), valid_to: new Date(f.valid_to).toISOString() });
      toast(t("market.posted"));
      qc.invalidateQueries({ queryKey: ["m-offers"] });
      qc.invalidateQueries({ queryKey: ["m-stats"] });
      router.push("/market");
    } catch {
      toast.error(t("common.error_body"));
    }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <PageTitle>{t("market.form_title")}</PageTitle>
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <Card>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
            <Field label={t("market.category")} htmlFor="cat"><select id="cat" value={f.category_slug} onChange={set("category_slug")} className="min-h-14 w-full rounded-[16px] border-[length:var(--bw)] border-line bg-surface px-4 text-lg">{CATS.map((c) => <option key={c} value={c}>{t(`cat.${c}`)}</option>)}</select></Field>
            <Field label={t("market.unit")} htmlFor="unit"><select id="unit" value={f.unit} onChange={set("unit")} className="min-h-14 w-full rounded-[16px] border-[length:var(--bw)] border-line bg-surface px-4 text-lg">{UNITS.map((u) => <option key={u} value={u}>{t(`unit.${u}`)}</option>)}</select></Field>
            <Field label={t("market.title_ml")} error={errs.title_ml} htmlFor="tml"><Input id="tml" value={f.title_ml} onChange={set("title_ml")} /></Field>
            <Field label={t("market.title_en")} error={errs.title_en} htmlFor="ten"><Input id="ten" value={f.title_en} onChange={set("title_en")} /></Field>
            <Field label={t("market.price")} error={errs.price} htmlFor="price"><Input id="price" inputMode="decimal" value={f.price} onChange={set("price")} /></Field>
            <Field label={t("market.qty")} error={errs.qty_available} htmlFor="qty"><Input id="qty" inputMode="decimal" value={f.qty_available} onChange={set("qty_available")} /></Field>
            <Field label={t("market.valid_from")} htmlFor="vf"><Input id="vf" type="datetime-local" value={f.valid_from} onChange={set("valid_from")} /></Field>
            <Field label={t("market.valid_to")} error={errs.valid_to} htmlFor="vt"><Input id="vt" type="datetime-local" value={f.valid_to} onChange={set("valid_to")} /></Field>
            <div className="sm:col-span-2"><Field label={t("market.area")} error={errs.area} htmlFor="area"><Input id="area" value={f.area} onChange={set("area")} /></Field></div>
            <div className="sm:col-span-2"><Button type="submit" size="lg" loading={busy}>{t("market.post")}</Button></div>
          </form>
        </Card>
        <aside aria-label={t("market.preview")}>
          <p className="mb-2 font-semibold text-muted">{t("market.preview")}</p>
          <Card className="space-y-3">
            <h2 className="text-xl">{(lang === "ml" ? f.title_ml : f.title_en) || t(`cat.${f.category_slug}`)}</h2>
            <p className="text-muted">{stats.data.market_name} · {f.area || "-"}</p>
            <p className="inline-block rounded-full bg-accent px-4 py-1.5 text-lg font-bold text-on-accent">{t("offers.save", { n: "…" })}</p>
            <div className="card-2 p-3"><p className="text-sm text-muted">{t("offers.price")}</p><p className="num text-3xl font-extrabold text-primary">{f.price ? rupee(Number(f.price)) : "-"}<span className="text-base font-medium text-muted">/{t(`unit.${f.unit}`)}</span></p></div>
            <p className="text-muted">{t("offers.valid", { date: f.valid_to.slice(0, 10) })}</p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
