"use client";
import { useQueryClient } from "@tanstack/react-query";
import { Flag, MapPin, Phone } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button, ButtonLink, Card, EmptyState, ErrorState, ListSkeleton, PageTitle } from "@/components/cw/ui";
import { ItemEmoji } from "@/components/cw/widgets";
import { post, useOffers } from "@/lib/api/hooks";
import { rupee } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export function OffersScreen() {
  const { t, lang } = useI18n();
  const q = useOffers();
  const qc = useQueryClient();

  useEffect(() => {
    q.data?.filter((o) => !o.seen).forEach((o) => post(`/api/v1/offers/${o.id}/seen`).catch(() => {}));
  }, [q.data]);

  const report = async (id: string) => {
    try {
      await post(`/api/v1/offers/${id}/report`);
      toast(t("offers.reported"));
      qc.invalidateQueries({ queryKey: ["offers"] });
    } catch {
      toast.error(t("common.error_body"));
    }
  };

  return (
    <div className="space-y-4">
      <PageTitle sub={t("offers.note")}>{t("offers.title")}</PageTitle>
      {q.isPending ? (
        <ListSkeleton rows={3} h="h-56" />
      ) : q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : !q.data.length ? (
        <EmptyState title={t("offers.empty")} body={t("offers.empty_body")} />
      ) : (
        <ul className="space-y-4">
          {q.data.map((o) => (
            <li key={o.id}>
              <Card className="space-y-3" data-testid="offer-card">
                <div className="flex items-center gap-3">
                  <ItemEmoji emoji={o.item.emoji} name={o.item.name_en} className="text-5xl" />
                  <div className="min-w-0">
                    <h2 className="text-xl">{lang === "ml" ? o.title_ml : o.title_en}</h2>
                    <p className="text-muted">{o.market.name} · {o.market.area}</p>
                  </div>
                </div>
                <p className="inline-block rounded-full bg-accent px-4 py-1.5 text-lg font-bold text-on-accent">{t("offers.save", { n: o.saving.toLocaleString("en-IN") })}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="card-2 p-3"><p className="text-sm text-muted">{t("offers.price")}</p><p className="num text-3xl font-extrabold text-primary">{rupee(o.price)}<span className="text-base font-medium text-muted">/{t(`unit.${o.unit}`)}</span></p></div>
                  <div className="card-2 p-3"><p className="text-sm text-muted">{t("offers.usual")}</p><p className="num text-3xl font-bold">{rupee(o.item.buy_price)}</p></div>
                </div>
                <p className="text-muted">{t("offers.valid", { date: o.valid_to.slice(0, 10) })}</p>
                <div className="grid grid-cols-2 gap-3">
                  {o.market.phone ? <ButtonLink href={`tel:${o.market.phone}`} variant="primary"><Phone className="size-5" aria-hidden /> {t("offers.call")}</ButtonLink> : <span />}
                  <ButtonLink href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${o.market.name} ${o.market.area}`)}`} variant="soft" target="_blank" rel="noreferrer"><MapPin className="size-5" aria-hidden /> {t("offers.directions")}</ButtonLink>
                </div>
                <Button variant="ghost" size="sm" onClick={() => report(o.id)}><Flag className="size-4" aria-hidden /> {t("offers.report")}</Button>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
