"use client";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/cw/shell";
import { Button, Field, Input, ListSkeleton } from "@/components/cw/ui";
import { ItemEmoji } from "@/components/cw/widgets";
import { api } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n";
import { catalogFor, KERALA_AREAS } from "@/shared/catalog";
import type { ItemInput, StallType } from "@/shared/schemas/domain";
import { cn } from "@/lib/utils";

const STALLS: { id: StallType; emoji: string }[] = [
  { id: "fruit", emoji: "🥭" },
  { id: "vegetable", emoji: "🍅" },
  { id: "tea_snacks", emoji: "☕" },
  { id: "juice", emoji: "🥤" },
];

export function Onboarding() {
  const { t, lang, setLang } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const me = useRoleGuardLite();
  const [step, setStep] = useState(0);
  const [stall, setStall] = useState<StallType | null>(null);
  const [items, setItems] = useState<ItemInput[]>([]);
  const [area, setArea] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const total = 4;

  useEffect(() => {
    if (stall) setItems(catalogFor(stall));
  }, [stall]);

  const setPrice = (i: number, k: "buy_price" | "sell_price", v: string) =>
    setItems((xs) => xs.map((x, j) => (j === i ? { ...x, [k]: Math.max(0, Number(v.replace(/[^0-9.]/g, "")) || 0) } : x)));

  const finish = async () => {
    if (!stall) return;
    if (!area.trim() || !name.trim()) return setErr(t("err.REQUIRED"));
    setBusy(true);
    setErr("");
    try {
      await api("/api/v1/vendors/onboard", { method: "POST", body: { name: name.trim(), language: lang, stall_type: stall, area: area.trim(), items } });
      await qc.invalidateQueries({ queryKey: ["me"] });
      router.replace("/app");
    } catch {
      setErr(t("common.error_body"));
      setBusy(false);
    }
  };

  const canNext = step === 0 || (step === 1 && !!stall) || (step === 2 && items.length > 0 && items.every((i) => i.sell_price > 0));

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar />
      <main id="main" className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-6 pt-4">
        <div className="mb-2 flex items-center gap-2" aria-label={t("onb.step", { n: step + 1, total })}>
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} className={cn("h-2 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-line")} />
          ))}
        </div>
        <p className="mb-4 text-muted">{t("onb.step", { n: step + 1, total })}</p>

        {!me.data ? (
          <ListSkeleton rows={3} />
        ) : (
          <div className="flex-1">
            {step === 0 && (
              <section>
                <h1 className="mb-6 text-3xl">{t("onb.lang_title")}</h1>
                <div className="grid gap-4">
                  {([["ml", "മലയാളം"], ["en", "English"]] as const).map(([l, label]) => (
                    <button key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l} className={cn("btn-press card flex min-h-24 items-center justify-between px-6 text-3xl font-bold", lang === l && "!border-primary ring-4 ring-primary/30")}>
                      {label}
                      {lang === l && <Check className="size-8 text-primary" aria-hidden />}
                    </button>
                  ))}
                </div>
              </section>
            )}
            {step === 1 && (
              <section>
                <h1 className="mb-6 text-3xl">{t("onb.stall_title")}</h1>
                <div className="grid grid-cols-2 gap-4">
                  {STALLS.map((s) => (
                    <button key={s.id} type="button" onClick={() => setStall(s.id)} aria-pressed={stall === s.id} className={cn("btn-press card flex aspect-square flex-col items-center justify-center gap-2 text-xl font-bold", stall === s.id && "!border-primary ring-4 ring-primary/30")} data-testid={`stall-${s.id}`}>
                      <span className="text-6xl" aria-hidden>{s.emoji}</span>
                      {t(`stall.${s.id}`)}
                    </button>
                  ))}
                </div>
              </section>
            )}
            {step === 2 && (
              <section>
                <h1 className="mb-2 text-3xl">{t("onb.items_title")}</h1>
                <p className="mb-4 text-muted">{t("onb.items_hint")}</p>
                <ul className="space-y-3">
                  {items.map((it, i) => (
                    <li key={i} className="card p-3">
                      <div className="flex items-center gap-3">
                        <ItemEmoji emoji={it.emoji} name={it.name_en} className="text-4xl" />
                        <p className="flex-1 text-lg font-bold">{lang === "ml" ? it.name_ml : it.name_en}</p>
                        <button type="button" aria-label={`${t("common.remove")} ${it.name_en}`} onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))} className="btn-press tap-target grid place-items-center rounded-full hover:bg-surface-2">
                          <X className="size-6" aria-hidden />
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-3">
                        <label className="text-sm font-semibold text-muted">
                          {t("onb.buy")} (₹/{t(`unit.${it.unit}`)})
                          <Input inputMode="decimal" className="num mt-1" value={it.buy_price} onChange={(e) => setPrice(i, "buy_price", e.target.value)} />
                        </label>
                        <label className="text-sm font-semibold text-muted">
                          {t("onb.sell")} (₹/{t(`unit.${it.unit}`)})
                          <Input inputMode="decimal" className="num mt-1" value={it.sell_price} onChange={(e) => setPrice(i, "sell_price", e.target.value)} />
                        </label>
                      </div>
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="mt-3 w-full" onClick={() => setItems((xs) => [...xs, { name_ml: t("settings.new_item"), name_en: "New item", emoji: "🛒", unit: "kg", unit_step: 1, buy_price: 10, sell_price: 15, category_slug: "other", perishable: true }])}>
                  <Plus className="size-5" aria-hidden /> {t("onb.add_item")}
                </Button>
              </section>
            )}
            {step === 3 && (
              <section className="space-y-5">
                <h1 className="text-3xl">{t("onb.area_title")}</h1>
                <Field label={t("onb.name")} htmlFor="vname"><Input id="vname" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></Field>
                <Field label={t("auth.area")} htmlFor="varea"><Input id="varea" value={area} onChange={(e) => setArea(e.target.value)} /></Field>
                <div className="flex flex-wrap gap-2">
                  {KERALA_AREAS.map((a) => (
                    <button key={a} type="button" onClick={() => setArea(a)} aria-pressed={area === a} className={cn("btn-press min-h-11 rounded-full border-[length:var(--bw)] border-line px-4 font-semibold", area === a ? "bg-primary text-on-primary" : "bg-surface")}>{a}</button>
                  ))}
                </div>
                {err && <p role="alert" className="font-medium text-danger">{err}</p>}
              </section>
            )}
          </div>
        )}

        <div className="sticky bottom-0 mt-6 flex gap-3 bg-bg py-3">
          {step > 0 && <Button variant="outline" onClick={() => setStep(step - 1)}>{t("common.back")}</Button>}
          {step < total - 1 ? (
            <Button className="flex-1" size="lg" disabled={!canNext} onClick={() => setStep(step + 1)} data-testid="onb-next">{t("common.next")}</Button>
          ) : (
            <Button className="flex-1" size="lg" loading={busy} onClick={finish} data-testid="onb-finish">{t("onb.finish")}</Button>
          )}
        </div>
      </main>
    </div>
  );
}

/** Role check without the onboarded-redirect used in the vendor shell. */
function useRoleGuardLite() {
  const router = useRouter();
  const me = useRoleGuardNoOnboard();
  useEffect(() => {
    if (me.data?.role === "vendor" && me.data.onboarded) router.replace("/app");
  }, [me.data, router]);
  return me;
}
import { useMe } from "@/lib/api/hooks";
function useRoleGuardNoOnboard() {
  const router = useRouter();
  const me = useMe();
  useEffect(() => {
    if (me.error && (me.error as { status?: number }).status === 401) router.replace("/login");
    if (me.data && me.data.role !== "vendor") router.replace(`/${me.data.role}`);
  }, [me.data, me.error, router]);
  return me;
}
