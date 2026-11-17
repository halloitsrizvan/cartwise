"use client";
import { useQueryClient } from "@tanstack/react-query";
import { EyeOff, LogOut, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button, Card, ErrorState, Field, Input, ListSkeleton, PageTitle } from "@/components/cw/ui";
import { ItemEmoji } from "@/components/cw/widgets";
import { api } from "@/lib/api/client";
import { patch, post, useItems, useVendor } from "@/lib/api/hooks";
import { useI18n } from "@/lib/i18n";
import { useTheme, type SizePref, type ThemePref } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { BarChart3, Bell, ChevronRight, Settings, ShieldCheck, Tag } from "lucide-react";
import type { ItemDTO } from "@/shared/schemas/domain";

export function MoreScreen() {
  const { t } = useI18n();
  const links = [
    { href: "/app/passport", label: t("more.passport"), icon: ShieldCheck },
    { href: "/app/offers", label: t("more.offers"), icon: Tag },
    { href: "/app/notices", label: t("more.notices"), icon: Bell },
    { href: "/app/money", label: t("money.title"), icon: BarChart3 },
    { href: "/app/settings", label: t("more.settings"), icon: Settings },
  ];
  return (
    <div className="space-y-4">
      <PageTitle>{t("more.title")}</PageTitle>
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

function ItemRow({ item }: { item: ItemDTO }) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [buy, setBuy] = useState(String(item.buy_price));
  const [sell, setSell] = useState(String(item.sell_price));
  const dirty = Number(buy) !== item.buy_price || Number(sell) !== item.sell_price;
  const save = async () => {
    const b = Number(buy);
    const s = Number(sell);
    if (!(b >= 0) || !(s > 0)) return toast.error(t("err.PRICE_INVALID"));
    await patch(`/api/v1/items/${item.id}`, { buy_price: b, sell_price: s });
    toast(t("settings.saved"));
    qc.invalidateQueries({ queryKey: ["items"] });
    qc.invalidateQueries({ queryKey: ["today"] });
  };
  const hide = async () => {
    await api(`/api/v1/items/${item.id}`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["items"] });
    qc.invalidateQueries({ queryKey: ["today"] });
  };
  return (
    <li className="card space-y-3 p-4">
      <div className="flex items-center gap-3">
        <ItemEmoji emoji={item.emoji} name={item.name_en} className="text-4xl" />
        <p className="flex-1 text-xl font-bold">{lang === "ml" ? item.name_ml : item.name_en}</p>
        <button type="button" onClick={hide} aria-label={`${t("settings.hide_item")}: ${item.name_en}`} className="btn-press tap-target grid place-items-center rounded-full hover:bg-surface-2"><EyeOff className="size-6" aria-hidden /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-semibold text-muted">{t("settings.buy_price")} (₹/{t(`unit.${item.unit}`)})<Input inputMode="decimal" className="num mt-1" value={buy} onChange={(e) => setBuy(e.target.value.replace(/[^0-9.]/g, ""))} /></label>
        <label className="text-sm font-semibold text-muted">{t("settings.sell_price")} (₹/{t(`unit.${item.unit}`)})<Input inputMode="decimal" className="num mt-1" value={sell} onChange={(e) => setSell(e.target.value.replace(/[^0-9.]/g, ""))} /></label>
      </div>
      {dirty && <Button className="w-full" onClick={save}>{t("common.save")}</Button>}
    </li>
  );
}

export function SettingsScreen() {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme, size, setSize } = useTheme();
  const items = useItems();
  const vendor = useVendor();
  const qc = useQueryClient();
  const router = useRouter();
  const [pin, setPin] = useState({ cur: "", next: "" });
  const [pinErr, setPinErr] = useState("");

  const changeLang = (l: "ml" | "en") => {
    setLang(l);
    patch("/api/v1/vendors/me", { language: l }).catch(() => {});
  };
  const addItem = async () => {
    await post("/api/v1/items", { name_ml: t("settings.new_item"), name_en: "New item", emoji: "🛒", unit: "kg", unit_step: 1, buy_price: 10, sell_price: 15, category_slug: "other", perishable: true });
    qc.invalidateQueries({ queryKey: ["items"] });
    qc.invalidateQueries({ queryKey: ["today"] });
  };
  const changePin = async () => {
    setPinErr("");
    if (!/^\d{4,6}$/.test(pin.cur) || !/^\d{4,6}$/.test(pin.next)) return setPinErr(t("err.PIN_INVALID"));
    try {
      await post("/api/v1/auth/pin", { current_pin: pin.cur, new_pin: pin.next });
      setPin({ cur: "", next: "" });
      toast(t("settings.pin_changed"));
    } catch {
      setPinErr(t("err.UNAUTHORIZED"));
    }
  };
  const logout = async () => {
    await post("/api/v1/auth/logout").catch(() => {});
    qc.clear();
    router.replace("/login");
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

      <section>
        <h2 className="mb-3 text-2xl">{t("settings.items")}</h2>
        {items.isPending ? <ListSkeleton rows={3} h="h-36" /> : items.isError ? <ErrorState onRetry={() => items.refetch()} /> : (
          <ul className="space-y-3">{items.data.map((i) => <ItemRow key={`${i.id}-${i.buy_price}-${i.sell_price}`} item={i} />)}</ul>
        )}
        <Button variant="outline" className="mt-3 w-full" onClick={addItem}><Plus className="size-5" aria-hidden /> {t("onb.add_item")}</Button>
      </section>

      {vendor.data?.phone && (
        <Card className="space-y-3">
          <h2 className="text-xl">{t("settings.pin")}</h2>
          <Field label={t("settings.pin_current")} htmlFor="pin-cur"><Input id="pin-cur" type="password" inputMode="numeric" maxLength={6} value={pin.cur} onChange={(e) => setPin({ ...pin, cur: e.target.value.replace(/\D/g, "") })} /></Field>
          <Field label={t("settings.pin_new")} htmlFor="pin-new" error={pinErr}><Input id="pin-new" type="password" inputMode="numeric" maxLength={6} value={pin.next} onChange={(e) => setPin({ ...pin, next: e.target.value.replace(/\D/g, "") })} /></Field>
          <Button className="w-full" onClick={changePin}>{t("settings.pin")}</Button>
        </Card>
      )}

      <Button variant="outline" size="lg" className="w-full" onClick={logout}><LogOut className="size-5" aria-hidden /> {t("common.logout")}</Button>
    </div>
  );
}
