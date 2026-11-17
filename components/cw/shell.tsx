"use client";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, Package, Settings, ShieldCheck, UserRound, CloudOff, CloudUpload, Home, Languages, LogOut, MoreHorizontal, ShoppingBasket, Wallet, ClipboardList, FileText, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import { useMe } from "@/lib/api/hooks";
import { post } from "@/lib/api/hooks";
import { useI18n } from "@/lib/i18n";
import { onOpApplied, onSyncFailure, onSynced, startSync, useSyncState } from "@/lib/offline/queue";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { ButtonLink, Chip, ListSkeleton } from "./ui";

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
  if (!off && s.pending === 0) return null; // nothing to report: no "Synced" badge
  let label = "";
  let Icon = CloudUpload;
  let cls = "";
  if (off) {
    label = t("sync.offline", { n: s.pending });
    Icon = CloudOff;
    cls = "bg-accent text-on-accent";
  } else {
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

/** Profile button when signed in, Log in button otherwise. For public pages. */
export function AccountButton() {
  const { t } = useI18n();
  const me = useMe();
  if (me.isPending) return <span className="inline-block h-11 w-24" aria-hidden />;
  const user = me.data;
  if (!user) {
    return <ButtonLink href="/login" size="sm" variant="outline">{t("auth.login")}</ButtonLink>;
  }
  const href = user.role === "admin" ? "/admin" : user.onboarded ? "/app" : "/onboarding";
  const initial = (user.name || "").trim().charAt(0).toUpperCase();
  return (
    <Link href={href} aria-label={`${t("common.profile")}: ${user.name ?? ""}`} data-testid="profile-btn" className="btn-press inline-flex min-h-11 items-center gap-2 rounded-full bg-primary py-1 pl-1 pr-4 font-semibold text-on-primary">
      <span className="grid size-9 place-items-center rounded-full bg-on-primary/20" aria-hidden>{initial || <UserRound className="size-5" />}</span>
      <span className="max-w-[8rem] truncate">{user.name?.trim().split(" ")[0] || t("common.profile")}</span>
    </Link>
  );
}

export function TopBar({ right, account }: { right?: ReactNode; account?: boolean }) {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-30 border-b-[length:var(--bw)] border-line bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2">
        <Logo />
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <LangToggle />
          {account && <AccountButton />}
          {right}
        </div>
      </div>
    </header>
  );
}

/** Starts sync, guards the role, redirects when signed out. */
export function useRoleGuard(role: "vendor" | "admin") {
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
    if (d && d.role !== role) router.replace(d.role === "vendor" ? "/app" : "/admin");
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

const SIDE_LINKS = [
  { href: "/app", key: "nav.today", icon: Home, exact: true },
  { href: "/app/sell", key: "nav.sell", icon: ShoppingBasket },
  { href: "/app/plan", key: "nav.plan", icon: ClipboardList },
  { href: "/app/money", key: "nav.money", icon: Wallet },
  { href: "/app/products", key: "nav.products", icon: Package },
  { href: "/app/passport", key: "more.passport", icon: ShieldCheck },
  { href: "/app/notices", key: "more.notices", icon: Bell },
  { href: "/app/settings", key: "more.settings", icon: Settings },
] as const;

export function VendorShell({ children }: { children: ReactNode }) {
  const me = useRoleGuard("vendor");
  const path = usePathname();
  const { t } = useI18n();
  const ready = me.data?.role === "vendor" && me.data.onboarded;
  const isActive = (href: string, exact?: boolean) => (exact ? path === href : path === href || path.startsWith(href + "/"));
  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar />
      <div className="flex flex-1">
        {/* desktop: navigation lives in a left panel */}
        <aside className="no-print sticky top-[3.6rem] hidden h-[calc(100dvh-3.6rem)] w-64 shrink-0 overflow-y-auto border-r-[length:var(--bw)] border-line bg-surface p-4 md:block">
          <nav aria-label={t("nav.main")}>
            <ul className="space-y-1.5">
              {SIDE_LINKS.map((l) => {
                const active = isActive(l.href, "exact" in l ? l.exact : false);
                return (
                  <li key={l.href}>
                    <Link href={l.href} aria-current={active ? "page" : undefined} className={cn("btn-press flex min-h-12 items-center gap-3 rounded-2xl px-4 text-lg font-semibold", active ? "bg-primary text-on-primary" : "hover:bg-surface-2")}>
                      <l.icon className="size-6 shrink-0" aria-hidden />
                      {t(l.key)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>
        <main id="main" className="mx-auto w-full max-w-2xl min-w-0 flex-1 px-4 pb-32 pt-4 md:pb-12">
          {ready || me.isError ? children : <ListSkeleton rows={3} />}
        </main>
      </div>
      <nav aria-label={t("nav.main")} className="fixed inset-x-0 bottom-0 z-30 border-t-[length:var(--bw)] border-line bg-surface/95 backdrop-blur md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <ul className="mx-auto grid max-w-2xl grid-cols-5">
          {TABS.map((tab) => {
            const active = isActive(tab.href, "exact" in tab ? tab.exact : false);
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
const ADMIN_NAV: NavItem[] = [
  { href: "/admin", key: "officer.nav.overview", icon: LayoutDashboard },
  { href: "/admin/notices", key: "officer.nav.notices", icon: FileText },
  { href: "/admin/registrations", key: "officer.nav.registrations", icon: ClipboardList },
];

export function SideShell({ role, children }: { role: "admin"; children: ReactNode }) {
  const me = useRoleGuard(role);
  const path = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const nav = ADMIN_NAV;
  const qc = useQueryClient();
  const logout = async () => {
    await post("/api/v1/auth/logout").catch(() => {});
    qc.clear();
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

