"use client";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { post } from "@/lib/api/hooks";
import { useI18n } from "@/lib/i18n";
import { useSyncState } from "@/lib/offline/queue";
import { cn } from "@/lib/utils";
import { ConfirmSheet } from "./sheet";

/** Log out with a confirmation step. Variants: side (sidebar row), bar (compact, top bar), full (wide button). */
export function LogoutButton({ variant = "full", className }: { variant?: "side" | "bar" | "full"; className?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const sync = useSyncState();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    setBusy(true);
    await post("/api/v1/auth/logout").catch(() => {});
    qc.clear();
    setOpen(false);
    setBusy(false);
    router.replace("/login");
  };

  const styles = {
    side: "btn-press flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 text-lg font-semibold text-danger hover:bg-surface-2",
    bar: "btn-press inline-flex min-h-11 items-center gap-1.5 rounded-full border-[length:var(--bw)] border-line bg-surface px-3 font-semibold",
    full: "btn-press inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full border-[length:var(--bw)] border-line bg-surface px-6 text-lg font-semibold",
  } as const;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={t("common.logout")} data-testid="logout-btn" className={cn(styles[variant], className)}>
        <LogOut className={variant === "side" ? "size-6 shrink-0" : "size-5"} aria-hidden />
        <span className={variant === "bar" ? "hidden sm:inline" : undefined}>{t("common.logout")}</span>
      </button>
      <ConfirmSheet
        open={open}
        title={t("logout.title")}
        body={
          <div className="space-y-2">
            <p>{t("logout.body")}</p>
            {sync.pending > 0 && <p className="font-semibold text-danger">{t("logout.pending", { n: sync.pending })}</p>}
          </div>
        }
        confirmLabel={busy ? t("common.loading") : t("common.logout")}
        onConfirm={logout}
        onCancel={() => setOpen(false)}
        danger
      />
    </>
  );
}
