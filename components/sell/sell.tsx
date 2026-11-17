"use client";
import { Mic, Undo2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BottomSheet } from "@/components/cw/sheet";
import { Button, ButtonLink, EmptyState, ErrorState, ListSkeleton, PageTitle } from "@/components/cw/ui";
import { CountUp, ItemEmoji, Stepper } from "@/components/cw/widgets";
import type { TodayItem } from "@/lib/api/types";
import { fmtQty, haptic, rupee } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { recordSale, undoSale, useLiveToday, type SaleAction } from "@/lib/sales";
import { cn } from "@/lib/utils";
import { parseSaleUtterance, type VoiceHit } from "@/shared/voice";

type SR = { start: () => void; stop: () => void; lang: string; interimResults: boolean; maxAlternatives: number; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null };
const getSR = (): (new () => SR) | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

function ItemTile({ item, onAdd, onLong, disabled }: { item: TodayItem; onAdd: () => void; onLong: () => void; disabled?: boolean }) {
  const { lang, t } = useI18n();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const long = useRef(false);
  const name = lang === "ml" ? item.name_ml : item.name_en;
  const down = () => {
    long.current = false;
    timer.current = setTimeout(() => {
      long.current = true;
      haptic(25);
      onLong();
    }, 480);
  };
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  return (
    <button
      type="button"
      disabled={disabled}
      data-testid={`tile-${item.category_slug}`}
      aria-label={`${name}, ${rupee(item.sell_price)} / ${t(`unit.${item.unit}`)}, ${fmtQty(item.sold_qty)}`}
      className="btn-press card relative flex min-h-40 touch-manipulation select-none flex-col items-center justify-center gap-1 p-3 text-center disabled:opacity-60"
      onPointerDown={down}
      onPointerUp={() => {
        clear();
        if (!long.current) {
          haptic();
          onAdd();
        }
      }}
      onPointerLeave={clear}
      onPointerCancel={clear}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAdd();
        }
      }}
    >
      {item.sold_qty > 0 && (
        <span className="num absolute right-2 top-2 min-w-9 rounded-full bg-accent px-2 py-0.5 text-lg font-bold text-on-accent" data-testid={`qty-${item.category_slug}`}>
          {fmtQty(item.sold_qty)}
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

function VoiceSheet({ open, onClose, items, onConfirm }: { open: boolean; onClose: () => void; items: TodayItem[]; onConfirm: (hits: VoiceHit[]) => void }) {
  const { t, lang } = useI18n();
  const [heard, setHeard] = useState("");
  const [hits, setHits] = useState<VoiceHit[]>([]);
  const [listening, setListening] = useState(false);
  const [tried, setTried] = useState(false);
  const rec = useRef<SR | null>(null);

  const listen = useCallback(() => {
    const SRC = getSR();
    if (!SRC) return;
    const r = new SRC();
    r.lang = "ml-IN";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript ?? "";
      setHeard(text);
      setHits(parseSaleUtterance(text, items));
      setTried(true);
    };
    r.onerror = () => {
      setListening(false);
      setTried(true);
    };
    r.onend = () => setListening(false);
    rec.current = r;
    setHeard("");
    setHits([]);
    setTried(false);
    setListening(true);
    try {
      r.start();
    } catch {
      setListening(false);
    }
  }, [items]);

  useEffect(() => {
    if (open) listen();
    return () => rec.current?.stop();
  }, [open, listen]);

  const nameOf = (id: string) => items.find((i) => i.id === id);
  const reparse = (text: string) => {
    setHeard(text);
    setHits(parseSaleUtterance(text, items));
    setTried(true);
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t("voice.title")}
      footer={
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>{t("common.cancel")}</Button>
          <Button className="flex-1" disabled={!hits.length} onClick={() => { onConfirm(hits); onClose(); }} data-testid="voice-confirm">{t("voice.add_all")}</Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="card-2 flex min-h-16 items-center gap-3 p-4">
          <Mic className={cn("size-8 shrink-0", listening ? "text-danger" : "text-muted")} aria-hidden />
          <p className="text-lg" aria-live="polite">{listening ? t("voice.listening") : heard ? `${t("voice.heard")}: “${heard}”` : t("voice.none")}</p>
        </div>
        {hits.length > 0 && (
          <ul className="space-y-2" aria-label={t("voice.title")}>
            {hits.map((h) => {
              const it = nameOf(h.item_id)!;
              return (
                <li key={h.item_id} className="card flex items-center gap-3 p-3 text-xl font-bold">
                  <ItemEmoji emoji={it.emoji} name={it.name_en} className="text-4xl" />
                  <span className="num">{t("voice.line", { qty: fmtQty(h.qty), unit: t(`unit.${it.unit}`), name: lang === "ml" ? it.name_ml : it.name_en })}</span>
                </li>
              );
            })}
          </ul>
        )}
        {tried && !hits.length && <p className="font-medium text-danger">{t("voice.none")}</p>}
        <div className="flex gap-2">
          <input aria-label={t("voice.heard")} className="min-h-12 flex-1 rounded-[16px] border-[length:var(--bw)] border-line bg-surface px-3 text-lg" placeholder="2 kg mango" value={heard} onChange={(e) => reparse(e.target.value)} />
          <Button variant="soft" size="sm" onClick={listen}>{t("voice.again")}</Button>
        </div>
      </div>
    </BottomSheet>
  );
}

export function SellScreen() {
  const { t, lang } = useI18n();
  const live = useLiveToday();
  const [stack, setStack] = useState<SaleAction[]>([]);
  const [qtyItem, setQtyItem] = useState<TodayItem | null>(null);
  const [custom, setCustom] = useState(1);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [canVoice, setCanVoice] = useState(false);
  useEffect(() => setCanVoice(!!getSR()), []);

  const nameOf = (i: TodayItem) => (lang === "ml" ? i.name_ml : i.name_en);

  const add = async (item: TodayItem, qty: number) => {
    if (live.closed) return;
    const clientId = await recordSale(item.id, qty);
    setStack((s) => [{ clientId, itemId: item.id, name: nameOf(item), qty }, ...s].slice(0, 3));
  };
  const undo = async (a: SaleAction) => {
    setStack((s) => s.filter((x) => x.clientId !== a.clientId));
    await undoSale(a);
    toast(t("sell.undone"));
  };

  if (live.isPending) return <ListSkeleton rows={4} h="h-40" />;
  if (live.isError) return <ErrorState onRetry={() => live.refetch()} />;
  if (!live.items.length) return <EmptyState title={t("sell.empty")} body={t("sell.empty_body")} action={<ButtonLink href="/app/settings">{t("more.settings")}</ButtonLink>} />;

  return (
    <div>
      <PageTitle sub={t("sell.hint")}>{t("sell.title")}</PageTitle>
      {live.closed && <p className="card-2 mb-3 p-3 font-medium">{t("sell.closed_note")}</p>}
      <div className="grid grid-cols-2 gap-3" data-testid="sell-grid">
        {live.items.map((it) => (
          <ItemTile
            key={it.id}
            item={it}
            disabled={live.closed}
            onAdd={() => add(it, it.unit_step)}
            onLong={() => {
              setCustom(it.unit_step);
              setQtyItem(it);
            }}
          />
        ))}
      </div>

      {/* undo strip + sticky total */}
      <div className="fixed inset-x-0 bottom-[4.6rem] z-20 px-3" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
        <div className="mx-auto max-w-2xl space-y-2">
          {stack.length > 0 && (
            <ul aria-label={t("sell.last_actions")} className="flex gap-2 overflow-x-auto no-scrollbar">
              {stack.map((a) => (
                <li key={a.clientId} className="shrink-0">
                  <button type="button" onClick={() => undo(a)} className="btn-press flex min-h-12 items-center gap-2 rounded-full bg-ink px-4 text-bg shadow-lg" aria-label={`${t("sell.undo")}: ${a.name} ${fmtQty(a.qty)}`}>
                    <Undo2 className="size-5" aria-hidden />
                    <span className="num font-semibold">+{fmtQty(a.qty)} {a.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="card flex items-center justify-between px-5 py-3">
            <span className="text-lg font-semibold text-muted">{t("sell.total")}</span>
            <CountUp value={live.total} prefix="₹" className="text-3xl font-extrabold" />
          </div>
        </div>
      </div>

      {canVoice && !live.closed && (
        <button type="button" onClick={() => setVoiceOpen(true)} aria-label={t("sell.mic")} data-testid="mic-fab" className="btn-press fixed bottom-48 right-4 z-30 grid size-16 place-items-center rounded-full bg-accent text-on-accent shadow-xl">
          <Mic className="size-8" aria-hidden />
        </button>
      )}

      <BottomSheet open={!!qtyItem} onClose={() => setQtyItem(null)} title={qtyItem ? `${nameOf(qtyItem)}: ${t("sell.qty_sheet")}` : ""}>
        {qtyItem && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              {[1, 5, 10].map((n) => (
                <Button key={n} variant="soft" size="lg" onClick={() => { add(qtyItem, n * (qtyItem.unit_step < 1 ? 1 : 1)); setQtyItem(null); }}>+{n}</Button>
              ))}
            </div>
            <p className="font-semibold text-muted">{t("sell.custom")}</p>
            <Stepper value={custom} onChange={setCustom} step={qtyItem.unit_step} min={qtyItem.unit_step} label={nameOf(qtyItem)} unit={t(`unit.${qtyItem.unit}`)} size="lg" />
            <Button size="lg" className="w-full" onClick={() => { add(qtyItem, custom); setQtyItem(null); }}>{t("sell.add")} {fmtQty(custom)}</Button>
          </div>
        )}
      </BottomSheet>

      <VoiceSheet
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        items={live.items}
        onConfirm={async (hits) => {
          for (const h of hits) {
            const it = live.items.find((i) => i.id === h.item_id);
            if (it) await add(it, h.qty);
          }
        }}
      />
    </div>
  );
}
