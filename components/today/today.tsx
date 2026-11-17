"use client";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, CloudRain, PartyPopper, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button, ButtonLink, Card, Chip, ErrorState, ListSkeleton } from "@/components/cw/ui";
import { CountUp } from "@/components/cw/widgets";
import { CloseSheet } from "@/components/today/close-sheet";
import { patch, useNotices, useVendor } from "@/lib/api/hooks";
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
  const [closeOpen, setCloseOpen] = useState(false);
  const notices = useNotices();

  if (live.isPending) return <ListSkeleton rows={4} h="h-32" />;
  if (live.isError || !live.data) return <ErrorState onRetry={() => live.refetch()} />;
  const d = live.data;
  const hour = new Date().getHours();
  const greet = hour < 12 ? "today.greeting_morning" : hour < 17 ? "today.greeting_day" : "today.greeting_evening";
  const name = vendor.data?.name?.split(/\s+/)[0] ?? "";
  const after6 = hour >= 18;
  const closed = d.log.status === "closed" || live.closePending;
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

      <Card className="space-y-3 !border-0 !bg-deep !text-on-deep" data-testid="next-step">
        <h2 className="text-3xl">{closed ? t("today.next_plan_title") : after6 ? t("today.next_close_title") : t("today.next_sell_title")}</h2>
        <p className="text-lg opacity-85">{closed ? t("today.next_plan_sub") : after6 ? t("today.next_close_sub") : t("today.next_sell_sub")}</p>
        {after6 && !closed ? (
          <Button size="lg" variant="accent" className="w-full" onClick={() => setCloseOpen(true)} data-testid="next-step-cta">{t("today.close_day")}</Button>
        ) : (
          <ButtonLink href={closed ? "/app/plan" : "/app/sell"} size="lg" variant="accent" className="w-full" data-testid="next-step-cta">
            {closed ? t("today.see_plan") : t("today.sell_now")}
          </ButtonLink>
        )}
      </Card>

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

      {unread > 0 && (
        <Link href="/app/notices" className="inline-flex">
          <Chip tone="accent" className="min-h-11 px-4 text-base"><Bell className="size-5" aria-hidden /> {t("today.notice_chip")} ({unread})</Chip>
        </Link>
      )}

      {!closed && !after6 && (
        <Button size="md" variant="outline" className="w-full" onClick={() => setCloseOpen(true)} data-testid="close-day-cta">
          {t("today.close_day")}
        </Button>
      )}
      <CloseSheet open={closeOpen} onClose={() => setCloseOpen(false)} />
    </div>
  );
}
