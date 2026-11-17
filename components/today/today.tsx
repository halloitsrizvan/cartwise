"use client";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, CloudRain, PartyPopper, Wallet, Tag } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ButtonLink, Card, Chip, ErrorState, ListSkeleton } from "@/components/cw/ui";
import { CountUp } from "@/components/cw/widgets";
import { patch, useNotices, useOffers, useVendor } from "@/lib/api/hooks";
import type { Today } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n";
import { useLiveToday } from "@/lib/sales";
import { cn } from "@/lib/utils";

const CTX = [
  { key: "rain", icon: CloudRain, label: "today.rain" },
  { key: "festival", icon: PartyPopper, label: "today.festival" },
  { key: "payday_week", icon: Wallet, label: "today.payday" },
] as const;

export function TodayScreen() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const vendor = useVendor();
  const live = useLiveToday();
  const offers = useOffers();
  const notices = useNotices();

  if (live.isPending) return <ListSkeleton rows={4} h="h-32" />;
  if (live.isError || !live.data) return <ErrorState onRetry={() => live.refetch()} />;
  const d = live.data;
  const hour = new Date().getHours();
  const greet = hour < 12 ? "today.greeting_morning" : hour < 17 ? "today.greeting_day" : "today.greeting_evening";
  const name = vendor.data?.name?.split(/\s+/)[0] ?? "";
  const after6 = hour >= 18;
  const best = offers.data?.[0];
  const unread = notices.data?.filter((n) => !n.read).length ?? 0;

  const toggle = async (key: (typeof CTX)[number]["key"]) => {
    const next = !d.log[key];
    qc.setQueryData<Today>(["today"], (old) => (old ? { ...old, log: { ...old.log, [key]: next } } : old));
    try {
      await patch("/api/v1/day/context", { [key]: next });
    } catch {
      qc.invalidateQueries({ queryKey: ["today"] });
      toast.error(t("common.error_body"));
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-3xl">{t(greet, { name })}</h1>

      <Card className="space-y-3 !bg-primary !text-on-primary">
        <p className="text-lg font-semibold opacity-90">{t("today.plan_card")}</p>
        <p className="text-base opacity-90">{t("today.expected_profit")}</p>
        <CountUp value={d.plan_today.total_expected_profit} prefix="₹" className="text-5xl font-extrabold" />
        <ButtonLink href="/app/plan/today" variant="accent" className="w-full">{t("today.open_plan")}</ButtonLink>
      </Card>

      <Card className="flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold text-muted">{t("today.sales_total")}</p>
          <CountUp value={live.total} prefix="₹" className="text-4xl font-extrabold" />
        </div>
        <ButtonLink href="/app/sell" variant="soft">{t("today.sell_now")}</ButtonLink>
      </Card>

      <section aria-label={t("today.context")}>
        <p className="mb-2 font-semibold text-muted">{t("today.context")}</p>
        <div className="grid grid-cols-3 gap-3">
          {CTX.map((c) => {
            const on = d.log[c.key];
            return (
              <button key={c.key} type="button" role="switch" aria-checked={on} onClick={() => toggle(c.key)} data-testid={`ctx-${c.key}`} className={cn("btn-press flex min-h-24 flex-col items-center justify-center gap-1 rounded-[24px] border-[length:var(--bw)] font-semibold", on ? "border-primary bg-primary text-on-primary" : "border-line bg-surface")}>
                <c.icon className="size-8" aria-hidden />
                <span className="text-base">{t(c.label)}</span>
              </button>
            );
          })}
        </div>
      </section>

      {best && (
        <Link href="/app/offers" className="card btn-press flex items-center gap-3 p-4">
          <Tag className="size-8 shrink-0 text-primary" aria-hidden />
          <span className="text-lg font-semibold">{t("today.offer_teaser", { n: best.saving })}</span>
        </Link>
      )}
      {unread > 0 && (
        <Link href="/app/notices" className="inline-flex">
          <Chip tone="accent" className="min-h-11 px-4 text-base"><Bell className="size-5" aria-hidden /> {t("today.notice_chip")} ({unread})</Chip>
        </Link>
      )}

      {d.log.status === "closed" || live.closePending ? (
        <Card className="space-y-3 text-center">
          <p className="text-xl font-semibold">{t("today.closed")}</p>
          <ButtonLink href="/app/plan" size="lg" className="w-full">{t("today.see_plan")}</ButtonLink>
        </Card>
      ) : (
        <ButtonLink href="/app/close" size="lg" variant={after6 ? "primary" : "outline"} className="w-full" data-testid="close-day-cta">
          {t("today.close_day")}
        </ButtonLink>
      )}
    </div>
  );
}
