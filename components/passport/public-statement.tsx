"use client";
import { Printer } from "lucide-react";
import { TopBar } from "@/components/cw/shell";
import { Button, EmptyState, ListSkeleton } from "@/components/cw/ui";
import { StatementCard } from "@/components/passport/passport";
import { usePublicStatement } from "@/lib/api/hooks";
import { useI18n } from "@/lib/i18n";

export function PublicStatement({ token }: { token: string }) {
  const { t } = useI18n();
  const q = usePublicStatement(token);
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="no-print"><TopBar /></div>
      <main id="main" className="mx-auto w-full max-w-xl flex-1 space-y-4 px-4 py-6">
        {q.isPending ? (
          <ListSkeleton rows={1} h="h-80" />
        ) : q.isError || !q.data ? (
          <EmptyState title={t("public.not_found")} />
        ) : (
          <>
            <StatementCard t={t} name={q.data.first_name} stall={q.data.stall_type} from={q.data.period_from} to={q.data.period_to} avg={q.data.avg_daily_profit} days={q.data.active_days} consistency={q.data.consistency} generated={q.data.generated_at} by={q.data.generated_by} demo={q.data.demo} />
            {q.data.demo && <p className="text-center text-muted">{t("public.demo_note")}</p>}
            <Button className="no-print w-full" variant="outline" onClick={() => window.print()}><Printer className="size-5" aria-hidden /> {t("public.print")}</Button>
          </>
        )}
      </main>
    </div>
  );
}
