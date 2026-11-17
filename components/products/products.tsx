"use client";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BottomSheet } from "@/components/cw/sheet";
import { Button, Chip, EmptyState, ErrorState, Field, Input, ListSkeleton, PageTitle, Toggle } from "@/components/cw/ui";
import { ItemEmoji } from "@/components/cw/widgets";
import { del, patch, post, useItems } from "@/lib/api/hooks";
import { fmtQty, rupee } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { ItemDTO, Unit } from "@/shared/schemas/domain";
import { ALIASES } from "@/shared/voice";

type Form = {
  name_ml: string;
  name_en: string;
  emoji: string;
  unit: Unit;
  unit_step: string;
  buy_price: string;
  sell_price: string;
  category_slug: string;
  perishable: boolean;
};

const EMOJIS = ["🥭", "🍌", "🍎", "🍊", "🍍", "🍉", "🍅", "🧅", "🥔", "🥕", "🫘", "🥥", "🍋", "☕", "🥤", "🥯", "🧆", "🍇", "🥬", "🌶️", "🛒"];
const UNITS: Unit[] = ["kg", "piece", "cup", "bundle"];
const STEPS = ["0.25", "0.5", "1", "5"];
const CATS = ["other", ...Object.keys(ALIASES)];

const blank = (): Form => ({ name_ml: "", name_en: "", emoji: "🛒", unit: "kg", unit_step: "1", buy_price: "", sell_price: "", category_slug: "other", perishable: true });
const fromItem = (i: ItemDTO): Form => ({
  name_ml: i.name_ml,
  name_en: i.name_en,
  emoji: i.emoji,
  unit: i.unit,
  unit_step: String(i.unit_step),
  buy_price: String(i.buy_price),
  sell_price: String(i.sell_price),
  category_slug: i.category_slug,
  perishable: i.perishable,
});

const selectCls = "min-h-14 w-full rounded-[16px] border-[length:var(--bw)] border-line bg-surface px-4 text-lg";

function EditSheet({ item, open, onClose }: { item: ItemDTO | null; open: boolean; onClose: () => void }) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [f, setF] = useState<Form>(() => (item ? fromItem(item) : blank()));
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const isNew = !item;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const margin = Number(f.sell_price) - Number(f.buy_price);

  const refresh = () => {
    for (const k of ["items", "today", "plan", "plan-today"]) qc.invalidateQueries({ queryKey: [k] });
  };

  const save = async () => {
    const er: Record<string, string> = {};
    // a custom product keeps one name in both languages unless the other one is filled
    const ml = f.name_ml.trim() || f.name_en.trim();
    const en = f.name_en.trim() || f.name_ml.trim();
    if (!ml) er.name = t("err.REQUIRED");
    if (!(Number(f.sell_price) > 0)) er.sell_price = t("err.PRICE_INVALID");
    if (!(Number(f.buy_price) >= 0) || f.buy_price === "") er.buy_price = t("err.PRICE_INVALID");
    setErrs(er);
    if (Object.keys(er).length) return;
    const body = {
      name_ml: ml,
      name_en: en,
      emoji: f.emoji,
      unit: f.unit,
      unit_step: Number(f.unit_step),
      buy_price: Number(f.buy_price),
      sell_price: Number(f.sell_price),
      category_slug: f.category_slug,
      perishable: f.perishable,
    };
    setBusy(true);
    try {
      if (isNew) await post("/api/v1/items", body);
      else await patch(`/api/v1/items/${item!.id}`, body);
      toast(t("products.saved"));
      refresh();
      onClose();
    } catch {
      toast.error(t("common.error_body"));
    }
    setBusy(false);
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={isNew ? t("products.new") : t("products.edit")}
      footer={<Button size="lg" className="w-full" loading={busy} onClick={save} data-testid="product-save">{t("common.save")}</Button>}
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("products.name_ml")} error={lang === "ml" ? errs.name : undefined} htmlFor="p-ml"><Input id="p-ml" value={f.name_ml} maxLength={60} onChange={(e) => set("name_ml", e.target.value)} /></Field>
          <Field label={t("products.name_en")} error={lang === "en" ? errs.name : undefined} htmlFor="p-en"><Input id="p-en" value={f.name_en} maxLength={60} onChange={(e) => set("name_en", e.target.value)} data-testid="product-name-en" /></Field>
        </div>

        <div>
          <p className="mb-2 text-base font-semibold">{t("products.emoji")}</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("products.emoji")}>
            {EMOJIS.map((e) => (
              <button key={e} type="button" role="radio" aria-checked={f.emoji === e} onClick={() => set("emoji", e)} className={cn("btn-press grid size-12 place-items-center rounded-2xl text-2xl", f.emoji === e ? "bg-primary-soft ring-2 ring-primary" : "bg-surface-2")}>{e}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label={`${t("products.buy")} (₹)`} error={errs.buy_price} htmlFor="p-buy"><Input id="p-buy" inputMode="decimal" className="num" value={f.buy_price} onChange={(e) => set("buy_price", e.target.value.replace(/[^0-9.]/g, ""))} /></Field>
          <Field label={`${t("products.sell")} (₹)`} error={errs.sell_price} htmlFor="p-sell"><Input id="p-sell" inputMode="decimal" className="num" value={f.sell_price} onChange={(e) => set("sell_price", e.target.value.replace(/[^0-9.]/g, ""))} data-testid="product-sell" /></Field>
        </div>
        {f.sell_price !== "" && f.buy_price !== "" && (
          <p className={cn("rounded-2xl p-3 font-semibold", margin > 0 ? "bg-primary-soft" : "bg-surface-2 text-danger")}>
            {margin > 0 ? t("products.margin", { n: rupee(margin), unit: t(`unit.${f.unit}`) }) : t("products.margin_bad")}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label={t("products.unit")} htmlFor="p-unit">
            <select id="p-unit" className={selectCls} value={f.unit} onChange={(e) => set("unit", e.target.value as Unit)}>
              {UNITS.map((u) => <option key={u} value={u}>{t(`unit.${u}`)}</option>)}
            </select>
          </Field>
          <Field label={t("products.step")} htmlFor="p-step">
            <select id="p-step" className={selectCls} value={f.unit_step} onChange={(e) => set("unit_step", e.target.value)}>
              {[...new Set([...STEPS, f.unit_step])].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <Field label={t("products.category")} htmlFor="p-cat">
          <select id="p-cat" className={selectCls} value={f.category_slug} onChange={(e) => set("category_slug", e.target.value)}>
            {CATS.map((c) => <option key={c} value={c}>{c === "other" ? t("products.cat_other") : t(`cat.${c}`)}</option>)}
          </select>
        </Field>
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface-2 p-4">
          <div>
            <p className="font-semibold">{t("products.perishable")}</p>
            <p className="text-sm text-muted">{t("products.perishable_hint")}</p>
          </div>
          <Toggle checked={f.perishable} onChange={(v) => set("perishable", v)} label={t("products.perishable")} />
        </div>
      </div>
    </BottomSheet>
  );
}

export function ProductsScreen() {
  const { t, lang } = useI18n();
  const q = useItems(true);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<ItemDTO | null>(null);
  const [creating, setCreating] = useState(false);

  const toggleActive = async (i: ItemDTO) => {
    try {
      if (i.active) await del(`/api/v1/items/${i.id}`);
      else await patch(`/api/v1/items/${i.id}`, { active: true });
      for (const k of ["items", "today", "plan", "plan-today"]) qc.invalidateQueries({ queryKey: [k] });
    } catch {
      toast.error(t("common.error_body"));
    }
  };

  const items = q.data ?? [];
  const active = items.filter((i) => i.active);
  const hidden = items.filter((i) => !i.active);

  const Row = ({ i }: { i: ItemDTO }) => (
    <li className={cn("card flex items-center gap-3 p-3", !i.active && "opacity-70")} data-testid="product-row">
      <ItemEmoji emoji={i.emoji} name={i.name_en} className="text-4xl" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-bold">{lang === "ml" ? i.name_ml : i.name_en}</p>
        <p className="num text-sm text-muted">
          {t("products.buy")} {rupee(i.buy_price)} · {t("products.sell")} {rupee(i.sell_price)} / {t(`unit.${i.unit}`)} · {fmtQty(i.unit_step)}
        </p>
      </div>
      <button type="button" onClick={() => setEditing(i)} aria-label={`${t("common.edit")}: ${i.name_en}`} className="btn-press tap-target grid place-items-center rounded-full bg-primary-soft">
        <Pencil className="size-5" aria-hidden />
      </button>
      <button type="button" onClick={() => toggleActive(i)} aria-label={`${i.active ? t("products.hide") : t("products.show")}: ${i.name_en}`} className="btn-press tap-target grid place-items-center rounded-full hover:bg-surface-2">
        {i.active ? <Eye className="size-5" aria-hidden /> : <EyeOff className="size-5" aria-hidden />}
      </button>
    </li>
  );

  return (
    <div className="space-y-4">
      <PageTitle sub={t("products.sub")}>{t("products.title")}</PageTitle>
      <Button size="lg" className="w-full" onClick={() => setCreating(true)} data-testid="add-product"><Plus className="size-6" aria-hidden /> {t("products.add")}</Button>

      {q.isPending ? (
        <ListSkeleton rows={4} h="h-20" />
      ) : q.isError ? (
        <ErrorState onRetry={() => q.refetch()} />
      ) : !items.length ? (
        <EmptyState title={t("products.empty")} body={t("products.empty_body")} />
      ) : (
        <>
          <ul className="space-y-3">{active.map((i) => <Row key={i.id} i={i} />)}</ul>
          {hidden.length > 0 && (
            <section>
              <h2 className="mb-2 flex items-center gap-2 text-xl">{t("products.hidden")} <Chip tone="muted">{hidden.length}</Chip></h2>
              <ul className="space-y-3">{hidden.map((i) => <Row key={i.id} i={i} />)}</ul>
            </section>
          )}
        </>
      )}

      {editing && <EditSheet key={editing.id} item={editing} open onClose={() => setEditing(null)} />}
      {creating && <EditSheet key="new" item={null} open onClose={() => setCreating(false)} />}
    </div>
  );
}
