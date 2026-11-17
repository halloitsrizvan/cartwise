"use client";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, CloudOff, CloudUpload, Home, Languages, LogOut, MoreHorizontal, ShoppingBasket, Wallet, ClipboardList, Check, FileText, Building2, Tag, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import { APP_NAME } from "@/config/brand";
import { useMe } from "@/lib/api/hooks";
import { post } from "@/lib/api/hooks";
import { useI18n } from "@/lib/i18n";
import { onOpApplied, onSyncFailure, onSynced, startSync, useSyncState } from "@/lib/offline/queue";
import { cn } from "@/lib/utils";
import { Chip, ListSkeleton } from "./ui";

export function LangToggle() {
  const { lang, setLang, t } = useI18n();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === "ml" ? "en" : "ml")}
      aria-label={t("common.switch_language")}
      className="btn-press inline-flex min-h-11 items-center gap-1.5 rounded-full border-[length:var(--bw)] border-line bg-surface px-3 text-base font-semibold"
    >
      <Languages className="size-5" aria-hidden />
      {lang === "ml" ? "EN" : "മല"}
    </button>
  );
}

export function OfflineBadge() {
  const { t } = useI18n();
  const s = useSyncState();
  const off = !s.online;
  let label = t("sync.synced");
  let Icon = Check;
  let cls = "bg-primary-soft text-ink";
  if (off) {
    label = t("sync.offline", { n: s.pending });
    Icon = CloudOff;
    cls = "bg-accent text-on-accent";
  } else if (s.pending > 0) {
    label = t("sync.syncing", { n: s.pending });
    Icon = CloudUpload;
    cls = "bg-accent text-on-accent";
  }
  return (
    <span role="status" aria-live="polite" className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold", cls)} data-testid="sync-badge">
      <Icon className="size-4" aria-hidden />
      {label}
    </span>
  );
}

export function DemoBadge() {
  const { data } = useMe();
  const { t } = useI18n();
  if (!data?.demo) return null;
  return <Chip tone="accent">{t("common.demo_data")}</Chip>;
}

export function TopBar({ right }: { right?: ReactNode }) {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-30 border-b-[length:var(--bw)] border-line bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2">
        <Link href="/" className="font-heading text-xl font-bold text-primary" aria-label={`${APP_NAME} ${t("common.home")}`}>
          {APP_NAME}
        </Link>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <DemoBadge />
          <OfflineBadge />
          <LangToggle />
          {right}
        </div>
      </div>
    </header>
  );
}

/** Starts sync, guards the role, redirects when signed out. */
export function useRoleGuard(role: "vendor" | "officer" | "market") {
  const router = useRouter();
  const me = useMe();
  const { t } = useI18n();
  const qc = useQueryClient();
  useEffect(() => {
    startSync();
    const off1 = onSynced(() => {
      qc.invalidateQueries({ queryKey: ["today"] });
      qc.invalidateQueries({ queryKey: ["plan"] });
      qc.invalidateQueries({ queryKey: ["money"] });
      qc.invalidateQueries({ queryKey: ["before-after"] });
    });
    const off3 = onOpApplied((op) => {
      if (op.kind === "close") return;
      const sign = op.kind === "sale" ? 1 : -1;
      qc.setQueryData<import("@/lib/api/types").Today>(["today"], (old) =>
        old ? { ...old, items: old.items.map((i) => (i.id === op.itemId ? { ...i, sold_qty: Math.max(0, i.sold_qty + sign * op.qty) } : i)) } : old,
      );
    });
    const off2 = onSyncFailure((m) => toast.error(`${t("sync.failed")}: ${m}`));
    return () => {
      off1();
      off2();
      off3();
    };
  }, [qc, t]);
  useEffect(() => {
    const d = me.data;
    if (me.error && (me.error as { status?: number }).status === 401) router.replace("/login");
    if (d && d.role !== role) router.replace(d.role === "vendor" ? "/app" : `/${d.role}`);
    if (d && role === "vendor" && !d.onboarded) router.replace("/onboarding");
  }, [me.data, me.error, role, router]);
  return me;
}

const TABS = [
  { href: "/app", key: "nav.today", icon: Home, exact: true },
  { href: "/app/sell", key: "nav.sell", icon: ShoppingBasket },
  { href: "/app/plan", key: "nav.plan", icon: ClipboardList },
  { href: "/app/money", key: "nav.money", icon: Wallet },
  { href: "/app/more", key: "nav.more", icon: MoreHorizontal },
] as const;

export function VendorShell({ children }: { children: ReactNode }) {
  const me = useRoleGuard("vendor");
  const path = usePathname();
  const { t } = useI18n();
  const ready = me.data?.role === "vendor" && me.data.onboarded;
  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar />
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 pb-32 pt-4">
        {ready || me.isError ? children : <ListSkeleton rows={3} />}
      </main>
      <nav aria-label={t("nav.main")} className="fixed inset-x-0 bottom-0 z-30 border-t-[length:var(--bw)] border-line bg-surface/95 backdrop-blur" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <ul className="mx-auto grid max-w-2xl grid-cols-5">
          {TABS.map((tab) => {
            const active = "exact" in tab && tab.exact ? path === tab.href : path === tab.href || path.startsWith(tab.href + "/");
            const Icon = tab.icon;
            return (
              <li key={tab.href}>
                <Link href={tab.href} aria-current={active ? "page" : undefined} className={cn("btn-press flex min-h-16 flex-col items-center justify-center gap-0.5 px-1 text-sm font-semibold", active ? "text-primary" : "text-muted")}>
                  <span className={cn("grid h-8 w-14 place-items-center rounded-full", active && "bg-primary-soft")}>
                    <Icon className="size-6" aria-hidden />
                  </span>
                  {t(tab.key)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

type NavItem = { href: string; key: string; icon: typeof Home };
const OFFICER_NAV: NavItem[] = [
  { href: "/officer", key: "officer.nav.overview", icon: LayoutDashboard },
  { href: "/officer/notices", key: "officer.nav.notices", icon: FileText },
  { href: "/officer/registrations", key: "officer.nav.registrations", icon: ClipboardList },
  { href: "/officer/markets", key: "officer.nav.markets", icon: Building2 },
];
const MARKET_NAV: NavItem[] = [
  { href: "/market", key: "market.nav.overview", icon: BarChart3 },
  { href: "/market/new", key: "market.nav.create", icon: Tag },
];

export function SideShell({ role, children }: { role: "officer" | "market"; children: ReactNode }) {
  const me = useRoleGuard(role);
  const path = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const nav = role === "officer" ? OFFICER_NAV : MARKET_NAV;
  const logout = async () => {
    await post("/api/v1/auth/logout").catch(() => {});
    router.replace("/login");
  };
  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar
        right={
          <button type="button" onClick={logout} aria-label={t("common.logout")} className="btn-press inline-flex min-h-11 items-center gap-1.5 rounded-full border-[length:var(--bw)] border-line bg-surface px-3 font-semibold">
            <LogOut className="size-5" aria-hidden />
            <span className="hidden sm:inline">{t("common.logout")}</span>
          </button>
        }
      />
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-4 md:flex-row">
        <nav aria-label={t("nav.main")} className="md:w-60 md:shrink-0">
          <ul className="no-scrollbar flex gap-2 overflow-x-auto md:flex-col">
            {nav.map((n) => {
              const active = n.href === `/${role}` ? path === n.href : path.startsWith(n.href);
              const Icon = n.icon;
              return (
                <li key={n.href} className="shrink-0">
                  <Link href={n.href} aria-current={active ? "page" : undefined} className={cn("btn-press flex min-h-11 items-center gap-2 rounded-full px-4 font-semibold", active ? "bg-primary text-on-primary" : "bg-surface hover:bg-surface-2 border-[length:var(--bw)] border-line")}>
                    <Icon className="size-5" aria-hidden />
                    {t(n.key)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <main id="main" className="min-w-0 flex-1">
          {me.data?.role === role ? children : <ListSkeleton rows={3} />}
        </main>
      </div>
    </div>
  );
}

