"use client";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Link2, MessageCircle, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BottomSheet } from "@/components/cw/sheet";
import { Button, Card, Chip, EmptyState, ErrorState, ListSkeleton, PageTitle } from "@/components/cw/ui";
import { ProgressRing } from "@/components/cw/widgets";
import { del, patch, post, useReadiness, useShares, useStatement } from "@/lib/api/hooks";
import type { Readiness } from "@/lib/api/types";
import { rupee } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { APP_NAME } from "@/config/brand";
import { cn } from "@/lib/utils";

export function StatementCard({ name, stall, from, to, avg, days, consistency, generated, by, demo, t }: { name: string; stall: string; from: string | null; to: string | null; avg: number; days: number; consistency: string; generated: string; by: string; demo?: boolean; t: (k: string, v?: Record<string, string | number>) => string }) {
  return (
    <article className="card space-y-4 p-6" aria-label={t("passport.statement")} data-testid="statement">
      <header className="flex flex-wrap items-start justify-between gap-2 border-b-[length:var(--bw)] border-line pb-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted">{t("passport.statement")}</p>
          <h2 className="text-3xl">{name}</h2>
          <p className="text-muted">{t(`stall.${stall}`)}</p>
        </div>
        {demo && <Chip tone="accent">{t("common.seeded_tag")}</Chip>}
      </header>
      <div>
        <p className="text-muted">{t("passport.avg")}</p>
        <p className="num text-6xl font-extrabold text-primary" data-testid="avg-profit">{rupee(avg)}</p>
      </div>
      <dl className="grid grid-cols-2 gap-4">
        <div><dt className="text-muted">{t("passport.active")}</dt><dd className="num text-2xl font-bold">{days}</dd></div>
        <div><dt className="text-muted">{t("passport.consistency")}</dt><dd className="text-2xl font-bold">{t(`consistency.${consistency}`)}</dd></div>
        <div className="col-span-2"><dt className="text-muted">{t("passport.period")}</dt><dd className="num text-lg font-semibold">{from ?? "-"} → {to ?? "-"}</dd></div>
      </dl>
      <footer className="border-t-[length:var(--bw)] border-line pt-3 text-sm text-muted">
        {t("passport.generated", { app: by })} · <span className="num">{generated.slice(0, 10)}</span>
      </footer>
    </article>
  );
}

function Readiness_({ r, onToggle }: { r: Readiness; onToggle: (key: string, v: boolean) => void }) {
  const { t } = useI18n();
  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-4">
        <ProgressRing percent={r.percent} label={`${t("passport.readiness")} ${r.percent}%`} />
        <div>
          <h2 className="text-2xl">{t("passport.readiness")}</h2>
          <p className="text-sm font-semibold text-muted">{t("passport.indicative")}</p>
        </div>
      </div>
      <ul className="space-y-2">
        {r.items.map((i) => (
          <li key={i.key}>
            {i.auto ? (
              <div className="flex min-h-14 items-center gap-3 rounded-[16px] bg-surface-2 px-4">
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", i.passed ? "bg-primary text-on-primary" : "border-2 border-line")}>{i.passed && <Check className="size-5" aria-hidden />}</span>
                <span className="flex-1 font-medium">{t(`passport.item.${i.key}`)}</span>
                <span className="num text-sm font-semibold text-muted">{i.detail}</span>
              </div>
            ) : (
              <button type="button" role="checkbox" aria-checked={i.passed} onClick={() => onToggle(i.key, !i.passed)} className="btn-press flex min-h-14 w-full items-center gap-3 rounded-[16px] border-[length:var(--bw)] border-line bg-surface px-4 text-left">
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", i.passed ? "bg-primary text-on-primary" : "border-2 border-line")}>{i.passed && <Check className="size-5" aria-hidden />}</span>
                <span className="flex-1 font-medium">{t(`passport.item.${i.key}`)}</span>
                <span className="text-xs font-semibold text-muted">{t("passport.self")}</span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function PassportScreen() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const st = useStatement();
  const rd = useReadiness();
  const shares = useShares();
  const [url, setUrl] = useState<{ url: string; expires: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    try {
      const r = await post<{ id: string; url: string; expires_at: string }>("/api/v1/passport/share", {});
      setUrl({ url: r.url, expires: r.expires_at });
      qc.invalidateQueries({ queryKey: ["shares"] });
    } catch {
      toast.error(t("common.error_body"));
    }
    setBusy(false);
  };
  const toggle = async (key: string, v: boolean) => {
    qc.setQueryData<Readiness>(["readiness"], (old) => old && { ...old, items: old.items.map((i) => (i.key === key ? { ...i, passed: v } : i)) });
    try {
      await patch("/api/v1/passport/self-declared", { [key]: v });
    } finally {
      qc.invalidateQueries({ queryKey: ["readiness"] });
    }
  };
  const revoke = async (id: string) => {
    await del(`/api/v1/passport/share/${id}`);
    toast(t("passport.revoked"));
    qc.invalidateQueries({ queryKey: ["shares"] });
  };
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(t("common.copied"));
    } catch {
      toast(text);
    }
  };

  return (
    <div className="space-y-4">
      <PageTitle>{t("passport.title")}</PageTitle>
      {st.isPending ? (
        <ListSkeleton rows={1} h="h-72" />
      ) : st.isError || !st.data ? (
        <ErrorState onRetry={() => st.refetch()} />
      ) : (
        <StatementCard t={t} name={st.data.name} stall={st.data.stall_type} from={st.data.period_from} to={st.data.period_to} avg={st.data.avg_daily_profit} days={st.data.active_days} consistency={st.data.consistency} generated={st.data.generated_at} by={st.data.generated_by} demo={st.data.demo} />
      )}

      <Button size="lg" className="w-full" onClick={create} loading={busy} data-testid="share-btn"><Share2 className="size-6" aria-hidden /> {t("passport.share")}</Button>

      {rd.isPending ? <ListSkeleton rows={1} h="h-72" /> : rd.data ? <Readiness_ r={rd.data} onToggle={toggle} /> : null}

      <section>
        <h2 className="mb-2 text-2xl">{t("passport.links")}</h2>
        {shares.isPending ? (
          <ListSkeleton rows={1} h="h-16" />
        ) : !shares.data?.length ? (
          <EmptyState title={t("passport.no_links")} icon={<Link2 className="size-10" aria-hidden />} />
        ) : (
          <ul className="space-y-2">
            {shares.data.map((s) => (
              <li key={s.id} className="card flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">{s.active ? t("passport.active_link", { date: s.expires_at.slice(0, 10) }) : t("passport.expired")}</p>
                  <p className="num text-sm text-muted">{s.created_at.slice(0, 10)}</p>
                </div>
                {s.active && <Button variant="outline" size="sm" onClick={() => revoke(s.id)}>{t("passport.revoke")}</Button>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <BottomSheet open={!!url} onClose={() => setUrl(null)} title={t("passport.share_title")}>
        {url && (
          <div className="space-y-4">
            <p className="text-muted">{t("passport.share_note")}</p>
            <p className="card-2 break-all p-3 num text-sm" data-testid="share-url">{url.url}</p>
            <p className="font-semibold text-danger">{t("passport.share_once")}</p>
            <p className="text-muted">{t("passport.link_expires", { date: url.expires.slice(0, 10) })}</p>
            <div className="grid gap-3">
              <Button size="lg" onClick={() => copy(url.url)}><Copy className="size-5" aria-hidden /> {t("passport.copy_link")}</Button>
              <a className="btn-press inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-accent px-6 text-lg font-semibold text-on-accent" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`${t("passport.wa_text", { app: APP_NAME })} ${url.url}`)}`}>
                <MessageCircle className="size-5" aria-hidden /> {t("passport.whatsapp")}
              </a>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
