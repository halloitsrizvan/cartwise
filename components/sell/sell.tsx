"use client";
import { useQueryClient } from "@tanstack/react-query";
import { Mic, ShoppingBag, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BottomSheet } from "@/components/cw/sheet";
import { Button, ButtonLink, EmptyState, ErrorState, ListSkeleton, PageTitle } from "@/components/cw/ui";
import { ItemEmoji, Stepper } from "@/components/cw/widgets";
import { PaySheet } from "@/components/sell/pay-sheet";
import { canRecord, VoiceAssistant } from "@/components/sell/voice-assistant";
import type { TodayItem } from "@/lib/api/types";
import { fmtQty, haptic, rupee } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { newClientId } from "@/lib/offline/queue";
import { recordSale, undoSale, useLiveToday } from "@/lib/sales";
import { cn } from "@/lib/utils";

type Bill = Record<string, number>; // item id -> qty

function Tile({ item, inBill, onPick, disabled }: { item: TodayItem; inBill: number; onPick: () => void; disabled?: boolean }) {
  const { lang, t } = useI18n();
  const name = lang === "ml" ? item.name_ml : item.name_en;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        haptic();
        onPick();
      }}
      data-testid={`tile-${item.category_slug}`}
      aria-label={`${name}, ${rupee(item.sell_price)} / ${t(`unit.${item.unit}`)}${inBill ? `, ${fmtQty(inBill)}` : ""}`}
      className={cn("btn-press card relative flex min-h-36 flex-col items-center justify-center gap-1 p-3 text-center disabled:opacity-60", inBill > 0 && "!border-primary ring-4 ring-primary/25")}
    >
      {inBill > 0 && (
        <span className="num absolute right-2 top-2 min-w-9 rounded-full bg-primary px-2 py-0.5 text-lg font-bold text-on-primary" data-testid={`qty-${item.category_slug}`}>
          {fmtQty(inBill)}
        </span>
      )}
      <ItemEmoji emoji={item.emoji} name={item.name_en} className="text-6xl" />
      <span className="text-xl font-bold leading-tight">{name}</span>
      <span className="num text-base text-muted">
        {rupee(item.sell_price)} / {t(`unit.${item.unit}`)}
      </span>
    </button>
  );
}

export function SellScreen() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const live = useLiveToday();
  const [bill, setBill] = useState<Bill>({});
  const [pick, setPick] = useState<TodayItem | null>(null);
  const [qty, setQty] = useState(1);
  const [payOpen, setPayOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [canVoice, setCanVoice] = useState(false);
  useEffect(() => setCanVoice(canRecord()), []);

  const nameOf = (i: TodayItem) => (lang === "ml" ? i.name_ml : i.name_en);
  const byId = useMemo(() => new Map(live.items.map((i) => [i.id, i])), [live.items]);
  const lines = Object.entries(bill)
    .map(([id, q]) => ({ item: byId.get(id)!, qty: q }))
    .filter((l) => l.item && l.qty > 0);
  const total = lines.reduce((s, l) => s + l.qty * l.item.sell_price, 0);
  const count = lines.length;

  const openPicker = (it: TodayItem) => {
    setQty(bill[it.id] ?? it.unit_step);
    setPick(it);
  };
  const addToBill = (it: TodayItem, q: number) => {
    setBill((b) => {
      const next = { ...b };
      if (q > 0) next[it.id] = Math.round(q * 1000) / 1000;
      else delete next[it.id];
      return next;
    });
  };

  /** Customer paid: record every line as a sale (offline-safe queue), then clear the bill. */
  const complete = async (method: "cash" | "upi") => {
    const done: { clientId: string; itemId: string; qty: number }[] = [];
    const billId = newClientId();
    for (const l of lines) done.push({ clientId: await recordSale(l.item.id, l.qty, { billId, payMethod: method }), itemId: l.item.id, qty: l.qty });
    const amount = total;
    setBill({});
    setPayOpen(false);
    toast.success(t("sell.saved", { amt: rupee(amount) }), {
      duration: 8000,
      action: {
        label: t("sell.undo"),
        onClick: async () => {
          for (const d of done) await undoSale(d);
          toast(t("sell.undone"));
        },
      },
    });
  };

  if (live.isPending) return <ListSkeleton rows={4} h="h-36" />;
  if (live.isError) return <ErrorState onRetry={() => live.refetch()} />;
  if (!live.items.length) return <EmptyState title={t("sell.empty")} body={t("sell.empty_body")} action={<ButtonLink href="/app/products">{t("products.add")}</ButtonLink>} />;

  return (
    <div className="pb-44">
      <PageTitle sub={`${t("sell.total")}: ${rupee(live.total)}`}>{t("sell.title")}</PageTitle>
      {live.closed && <p className="card-2 mb-3 p-3 font-medium">{t("sell.closed_note")}</p>}
      {!live.closed && count === 0 && <p className="mb-3 text-lg text-muted">{t("sell.start_hint")}</p>}

      <div className="grid grid-cols-2 gap-3" data-testid="sell-grid">
        {live.items.map((it) => (
          <Tile key={it.id} item={it} inBill={bill[it.id] ?? 0} disabled={live.closed} onPick={() => openPicker(it)} />
        ))}
      </div>

      {/* bill bar */}
      {count > 0 && !live.closed && (
        <div className="dock-bar" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
          <div className="card mx-auto flex max-w-2xl items-center gap-3 !bg-deep p-3 !text-on-deep" data-testid="bill-bar">
            <ShoppingBag className="ml-2 size-7 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm opacity-85">{t("sell.items_n", { n: count })}</p>
              <p className="num text-2xl font-extrabold leading-tight">{rupee(total)}</p>
            </div>
            <Button variant="accent" size="md" onClick={() => setPayOpen(true)} data-testid="collect-btn">
              {t("sell.collect")}
            </Button>
          </div>
        </div>
      )}

      {canVoice && !live.closed && (
        <button type="button" onClick={() => setVoiceOpen(true)} aria-label={t("sell.mic")} data-testid="mic-fab" className={cn("btn-press fixed right-4 z-30 grid size-16 place-items-center rounded-full bg-accent text-on-accent shadow-xl", "bottom-[15.5rem] md:bottom-24")}>
          <Mic className="size-8" aria-hidden />
        </button>
      )}

      {/* quantity popup */}
      <BottomSheet
        dock
        open={!!pick}
        onClose={() => setPick(null)}
        title={pick ? t("sell.qty_for", { name: nameOf(pick) }) : ""}
        footer={
          pick && (
            <div className="flex gap-3">
              {bill[pick.id] !== undefined && (
                <Button variant="outline" aria-label={t("common.remove")} onClick={() => { addToBill(pick, 0); setPick(null); }}>
                  <Trash2 className="size-5" aria-hidden />
                </Button>
              )}
              <Button size="lg" className="flex-1" onClick={() => { addToBill(pick, qty); setPick(null); }} data-testid="add-to-bill">
                {t("sell.add_to_bill")} · {rupee(qty * pick.sell_price)}
              </Button>
            </div>
          )
        }
      >
        {pick && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <ItemEmoji emoji={pick.emoji} name={pick.name_en} className="text-5xl" />
              <p className="num text-lg text-muted">
                {rupee(pick.sell_price)} / {t(`unit.${pick.unit}`)}
              </p>
            </div>
            <Stepper value={qty} onChange={setQty} step={pick.unit_step} min={pick.unit_step} label={nameOf(pick)} unit={t(`unit.${pick.unit}`)} size="md" />
          </div>
        )}
      </BottomSheet>

      <PaySheet
        open={payOpen}
        onClose={() => setPayOpen(false)}
        lines={lines.map((l) => ({ id: l.item.id, name: nameOf(l.item), emoji: l.item.emoji, unit: t(`unit.${l.item.unit}`), qty: l.qty, price: l.item.sell_price, step: l.item.unit_step }))}
        total={total}
        onChangeQty={(id, q) => {
          const it = byId.get(id);
          if (it) addToBill(it, q);
        }}
        onPaid={complete}
        onUpiSaved={() => qc.invalidateQueries({ queryKey: ["vendor"] })}
      />

      <VoiceAssistant
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        items={live.items}
        onAdd={(hits) =>
          setBill((b) => {
            const next = { ...b };
            for (const h of hits) next[h.item_id] = Math.round(((next[h.item_id] ?? 0) + h.qty) * 1000) / 1000;
            return next;
          })
        }
        onRemove={(h) =>
          setBill((b) => {
            const next = { ...b };
            const left = Math.round(((next[h.item_id] ?? 0) - h.qty) * 1000) / 1000;
            if (left > 0) next[h.item_id] = left;
            else delete next[h.item_id];
            return next;
          })
        }
      />
    </div>
  );
}
