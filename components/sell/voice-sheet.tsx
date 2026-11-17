"use client";
import { Mic } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BottomSheet } from "@/components/cw/sheet";
import { Button } from "@/components/cw/ui";
import { ItemEmoji } from "@/components/cw/widgets";
import type { TodayItem } from "@/lib/api/types";
import { fmtQty } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { parseSaleUtterance, type VoiceHit } from "@/shared/voice";

type SR = { start: () => void; stop: () => void; lang: string; interimResults: boolean; maxAlternatives: number; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null };
export const getSR = (): (new () => SR) | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};


export function VoiceSheet({ open, onClose, items, onConfirm }: { open: boolean; onClose: () => void; items: TodayItem[]; onConfirm: (hits: VoiceHit[]) => void }) {
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

