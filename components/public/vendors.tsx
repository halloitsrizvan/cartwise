"use client";
import { ArrowLeft, MapPin, Phone, Search, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { TopBar } from "@/components/cw/shell";
import { ButtonLink, Card, Chip, EmptyState, ErrorState, Input, ListSkeleton } from "@/components/cw/ui";
import { ItemEmoji } from "@/components/cw/widgets";
import { usePublicVendor, usePublicVendors } from "@/lib/api/hooks";
import type { PublicVendor } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const STALL_EMOJI: Record<string, string> = { fruit: "🥭", vegetable: "🍅", tea_snacks: "☕", juice: "🥤" };

function Score({ n }: { n: number }) {
  const { t } = useI18n();
  return (
    <div className="grid size-16 shrink-0 place-items-center rounded-full bg-primary text-on-primary" role="img" aria-label={`${t("vendors.score")} ${n}`}>
      <span className="num text-2xl font-extrabold leading-none">{n}</span>
    </div>
  );
}

export function VendorCard({ v }: { v: PublicVendor }) {
  const { t } = useI18n();
  return (
    <Link href={`/vendors/${v.id}`} className="card btn-press flex items-center gap-4 p-4" data-testid="vendor-card">
      <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary-soft text-3xl" aria-hidden>{STALL_EMOJI[v.stall_type] ?? "🛒"}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {v.rank <= 3 && <Star className="size-5 shrink-0 fill-accent text-accent" aria-hidden />}
          <h3 className="truncate text-xl">{v.first_name}</h3>
        </div>
        <p className="text-muted">{t(`stall.${v.stall_type}`)} · {v.area}</p>
        <p className="num text-sm text-muted">{t("vendors.days", { n: v.days_active })}</p>
      </div>
      <Score n={v.score} />
    </Link>
  );
}

export function BestVendors() {
  const { t } = useI18n();
  const q = usePublicVendors({ limit: 6 });
  return (
    <section className="mt-12">
      <div className="mb-4 flex items-end justify-between gap-3">
        <h2 className="text-3xl">{t("landing.best_title")}</h2>
        <Link href="/vendors" className="font-semibold text-primary underline">{t("landing.best_more")}</Link>
      </div>
      {q.isPending ? <ListSkeleton rows={3} h="h-24" /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : !q.data.length ? <EmptyState title={t("vendors.empty")} body={t("vendors.empty_body")} /> : (
        <ul className="grid gap-3 md:grid-cols-2">
          {q.data.map((v) => <li key={v.id}><VendorCard v={v} /></li>)}
        </ul>
      )}
    </section>
  );
}

export function VendorsDirectory() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [area, setArea] = useState("");
  const [stall, setStall] = useState("");
  const res = usePublicVendors({ q: q.trim() || undefined, area: area.trim() || undefined, stall: stall || undefined, limit: 50 });
  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar />
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-6">
        <h1 className="text-4xl">{t("vendors.title")}</h1>
        <p className="mb-5 mt-1 text-lg text-muted">{t("vendors.sub")}</p>
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <label className="relative block">
            <span className="sr-only">{t("vendors.search")}</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
            <Input className="pl-12" placeholder={t("vendors.search")} value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <label className="relative block">
            <span className="sr-only">{t("vendors.area")}</span>
            <MapPin className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
            <Input className="pl-12" placeholder={t("vendors.area")} value={area} onChange={(e) => setArea(e.target.value)} />
          </label>
        </div>
        <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto" role="group" aria-label={t("vendors.all_stalls")}>
          {["", "fruit", "vegetable", "tea_snacks", "juice"].map((s) => (
            <button key={s} type="button" aria-pressed={stall === s} onClick={() => setStall(s)} className={cn("btn-press min-h-12 shrink-0 rounded-full border-[length:var(--bw)] border-line px-5 font-semibold", stall === s ? "bg-primary text-on-primary" : "bg-surface")}>
              {s ? `${STALL_EMOJI[s]} ${t(`stall.${s}`)}` : t("vendors.all_stalls")}
            </button>
          ))}
        </div>
        {res.isPending ? <ListSkeleton rows={4} h="h-24" /> : res.isError ? <ErrorState onRetry={() => res.refetch()} /> : !res.data.length ? <EmptyState title={t("vendors.empty")} body={t("vendors.empty_body")} /> : (
          <ul className="space-y-3">{res.data.map((v) => <li key={v.id}><VendorCard v={v} /></li>)}</ul>
        )}
        <p className="mt-6 text-center text-muted">{t("vendors.score_note")}</p>
      </main>
    </div>
  );
}

export function VendorProfile({ id }: { id: string }) {
  const { t, lang } = useI18n();
  const q = usePublicVendor(id);
  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar />
      <main id="main" className="mx-auto w-full max-w-xl flex-1 space-y-4 px-4 pb-16 pt-6">
        <Link href="/vendors" className="inline-flex min-h-11 items-center gap-2 font-semibold text-primary"><ArrowLeft className="size-5" aria-hidden /> {t("vendors.back")}</Link>
        {q.isPending ? <ListSkeleton rows={2} h="h-40" /> : q.isError || !q.data ? <EmptyState title={t("vendors.not_found")} /> : (
          <>
            <Card className="space-y-4" data-testid="vendor-profile">
              <div className="flex items-center gap-4">
                <span className="grid size-20 shrink-0 place-items-center rounded-3xl bg-primary-soft text-5xl" aria-hidden>{STALL_EMOJI[q.data.stall_type] ?? "🛒"}</span>
                <div className="min-w-0 flex-1">
                  <h1 className="text-3xl">{q.data.first_name}</h1>
                  <p className="text-lg text-muted">{t(`stall.${q.data.stall_type}`)} · {q.data.area}</p>
                  {q.data.rank <= 3 && <Chip tone="accent"><Star className="size-4 fill-current" aria-hidden /> {t("vendors.rank", { n: q.data.rank })}</Chip>}
                </div>
                <Score n={q.data.score} />
              </div>
              <div className="flex flex-wrap gap-2">
                {q.data.badges.map((b) => <Chip key={b}>{t(`badge.${b}`)}</Chip>)}
                <Chip tone="muted">{t("vendors.days", { n: q.data.days_active })}</Chip>
                <Chip tone="muted">{t(`consistency.${q.data.consistency}`)}</Chip>
              </div>
              {q.data.place && <p className="flex items-start gap-2 text-lg"><MapPin className="mt-1 size-5 shrink-0 text-primary" aria-hidden /> <span><span className="text-muted">{t("vendors.place")}: </span>{q.data.place}</span></p>}
              <div className="grid grid-cols-2 gap-3">
                {q.data.phone ? <ButtonLink href={`tel:${q.data.phone}`}><Phone className="size-5" aria-hidden /> {t("vendors.call")}</ButtonLink> : <span />}
                <ButtonLink variant="soft" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${q.data.place ?? ""} ${q.data.area} Kerala`)}`}><MapPin className="size-5" aria-hidden /> {t("vendors.directions")}</ButtonLink>
              </div>
            </Card>
            {q.data.items.length > 0 && (
              <Card>
                <h2 className="mb-3 text-xl">{t("vendors.items")}</h2>
                <ul className="flex flex-wrap gap-2">
                  {q.data.items.map((i) => (
                    <li key={i.name_en} className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2 font-semibold">
                      <ItemEmoji emoji={i.emoji} name={i.name_en} className="text-xl" /> {lang === "ml" ? i.name_ml : i.name_en}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            <p className="text-center text-muted">{t("vendors.score_note")}</p>
          </>
        )}
      </main>
    </div>
  );
}
