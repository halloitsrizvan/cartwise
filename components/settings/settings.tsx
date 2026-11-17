"use client";
import { useQueryClient } from "@tanstack/react-query";
import { EyeOff, LogOut, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { InstallCard } from "@/components/cw/install-card";
import { LogoutButton } from "@/components/cw/logout-button";
import { Button, Card, ErrorState, Field, Input, ListSkeleton, PageTitle, Toggle } from "@/components/cw/ui";
import { ItemEmoji } from "@/components/cw/widgets";
import { api } from "@/lib/api/client";
import { patch, post, useItems, useVendor } from "@/lib/api/hooks";
import { useI18n } from "@/lib/i18n";
import { useTheme, type SizePref, type ThemePref } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { BarChart3, Bell, Package, Receipt, ChevronRight, Settings, ShieldCheck } from "lucide-react";
import type { ItemDTO } from "@/shared/schemas/domain";

export function MoreScreen() {
  const { t } = useI18n();
  const links = [
    { href: "/app/passport", label: t("more.passport"), icon: ShieldCheck },
    { href: "/app/notices", label: t("more.notices"), icon: Bell },
    { href: "/app/money", label: t("money.title"), icon: BarChart3 },
    { href: "/app/payments", label: t("payments.title"), icon: Receipt },
    { href: "/app/products", label: t("products.title"), icon: Package },
    { href: "/app/settings", label: t("more.settings"), icon: Settings },
  ];
  return (
    <div className="space-y-4">
      <PageTitle>{t("more.title")}</PageTitle>
      <InstallCard />
      <ul className="space-y-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="card btn-press flex min-h-16 items-center gap-4 px-5 text-xl font-semibold">
              <l.icon className="size-7 text-primary" aria-hidden />
              <span className="flex-1">{l.label}</span>
              <ChevronRight className="size-6 text-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o.v} role="radio" aria-checked={value === o.v} type="button" onClick={() => onChange(o.v)} className={cn("btn-press min-h-12 rounded-full border-[length:var(--bw)] border-line px-5 font-semibold", value === o.v ? "bg-primary text-on-primary" : "bg-surface")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function PublicListing() {
  const { t } = useI18n();
  const vendor = useVendor();
  const qc = useQueryClient();
  const [phone, setPhone] = useState<string | null>(null);
  const [place, setPlace] = useState<string | null>(null);
  if (!vendor.data) return null;
  const v = vendor.data;
  const save = async (body: Record<string, unknown>) => {
    try {
      await patch("/api/v1/vendors/me", body);
      toast(t("listing.saved"));
      qc.invalidateQueries({ queryKey: ["vendor"] });
    } catch {
      toast.error(t("err.PHONE_INVALID"));
    }
  };
  const ph = phone ?? v.public_phone ?? "";
  const pl = place ?? v.public_place ?? "";
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl">{t("listing.title")}</h2>
        <Toggle checked={v.public_listed} onChange={(on) => save({ public_listed: on })} label={t("listing.title")} />
      </div>
      <p className="text-muted">{t("listing.hint")}</p>
      {v.public_listed && (
        <>
          <Field label={t("listing.phone")} htmlFor="pub-phone"><Input id="pub-phone" type="tel" inputMode="numeric" maxLength={10} value={ph} onChange={(e) => setPhone(e.target.value.replace(/D/g, ""))} /></Field>
          <Field label={t("listing.place")} htmlFor="pub-place"><Input id="pub-place" value={pl} onChange={(e) => setPlace(e.target.value)} /></Field>
          <Button className="w-full" onClick={() => save({ public_phone: ph || null, public_place: pl.trim() || null })}>{t("common.save")}</Button>
        </>
      )}
    </Card>
  );
}

function UpiCard() {
  const { t } = useI18n();
  const vendor = useVendor();
  const qc = useQueryClient();
  const [val, setVal] = useState<string | null>(null);
  const [err, setErr] = useState("");
  if (!vendor.data) return null;
  const cur = val ?? vendor.data.upi_id ?? "";
  const save = async () => {
    setErr("");
    const v = cur.trim();
    if (v && !/^[A-Za-z0-9._-]{2,64}@[A-Za-z][A-Za-z0-9.-]{1,40}$/.test(v)) return setErr(t("err.UPI_INVALID"));
    try {
      await patch("/api/v1/vendors/me", { upi_id: v || null });
      toast(t("settings.saved"));
      qc.invalidateQueries({ queryKey: ["vendor"] });
    } catch {
      setErr(t("common.error_body"));
    }
  };
  return (
    <Card className="space-y-3">
      <h2 className="text-xl">{t("settings.upi_title")}</h2>
      <p className="text-muted">{t("settings.upi_hint")}</p>
      <Field label={t("sell.upi_id")} htmlFor="upi" error={err}>
        <Input id="upi" value={cur} onChange={(e) => setVal(e.target.value.trim())} placeholder={t("sell.upi_example")} autoCapitalize="none" autoCorrect="off" inputMode="email" />
      </Field>
      <Button className="w-full" onClick={save}>{t("common.save")}</Button>
    </Card>
  );
}

export function SettingsScreen() {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme, size, setSize } = useTheme();
  const items = useItems();
  const qc = useQueryClient();
  const router = useRouter();
  const [pw, setPw] = useState({ cur: "", next: "" });
  const [pwErr, setPwErr] = useState("");

  const changeLang = (l: "ml" | "en") => {
    setLang(l);
    patch("/api/v1/vendors/me", { language: l }).catch(() => {});
  };
  const addItem = async () => {
    await post("/api/v1/items", { name_ml: t("settings.new_item"), name_en: "New item", emoji: "🛒", unit: "kg", unit_step: 1, buy_price: 10, sell_price: 15, category_slug: "other", perishable: true });
    qc.invalidateQueries({ queryKey: ["items"] });
    qc.invalidateQueries({ queryKey: ["today"] });
  };
  const changePassword = async () => {
    setPwErr("");
    if (pw.next.length < 8) return setPwErr(t("err.PASSWORD_SHORT"));
    try {
      await post("/api/v1/auth/password", { current_password: pw.cur, new_password: pw.next });
      setPw({ cur: "", next: "" });
      toast(t("settings.pin_changed"));
    } catch {
      setPwErr(t("err.UNAUTHORIZED"));
    }
  };

  return (
    <div className="space-y-6">
      <PageTitle>{t("settings.title")}</PageTitle>
      <Card className="space-y-4">
        <h2 className="text-xl">{t("settings.language")}</h2>
        <Segmented label={t("settings.language")} value={lang} onChange={changeLang} options={[{ v: "ml", label: "മലയാളം" }, { v: "en", label: "English" }]} />
        <h2 className="text-xl">{t("settings.theme")}</h2>
        <Segmented<ThemePref> label={t("settings.theme")} value={theme} onChange={setTheme} options={[{ v: "system", label: t("settings.theme_system") }, { v: "light", label: t("settings.theme_light") }, { v: "dark", label: t("settings.theme_dark") }, { v: "sunlight", label: t("settings.theme_sunlight") }]} />
        <h2 className="text-xl">{t("settings.size")}</h2>
        <Segmented<SizePref> label={t("settings.size")} value={size} onChange={setSize} options={[{ v: "normal", label: t("settings.size_normal") }, { v: "large", label: t("settings.size_large") }, { v: "xl", label: t("settings.size_xl") }]} />
      </Card>

      <UpiCard />

      <PublicListing />

      <Link href="/app/products" className="card btn-press flex min-h-16 items-center gap-4 px-5 text-xl font-semibold">
        <Package className="size-7 text-primary" aria-hidden />
        <span className="flex-1">{t("settings.items")}</span>
        <ChevronRight className="size-6 text-muted" aria-hidden />
      </Link>

      <Card className="space-y-3">
        <h2 className="text-xl">{t("settings.pin")}</h2>
        <Field label={t("settings.pin_current")} htmlFor="pw-cur"><Input id="pw-cur" type="password" autoComplete="current-password" value={pw.cur} onChange={(e) => setPw({ ...pw, cur: e.target.value })} /></Field>
        <Field label={t("settings.pin_new")} htmlFor="pw-new" error={pwErr}><Input id="pw-new" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
        <Button className="w-full" onClick={changePassword}>{t("settings.pin")}</Button>
      </Card>

      <LogoutButton variant="full" />
    </div>
  );
}
