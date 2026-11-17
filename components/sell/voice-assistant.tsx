"use client";
import { Loader2, Mic, RotateCcw, Square, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BottomSheet } from "@/components/cw/sheet";
import { Button } from "@/components/cw/ui";
import { ItemEmoji } from "@/components/cw/widgets";
import { ApiClientError } from "@/lib/api/client";
import type { TodayItem } from "@/lib/api/types";
import { fmtQty } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { parseSaleUtterance, type VoiceHit } from "@/shared/voice";

type Phase = "idle" | "recording" | "thinking" | "done" | "error";
const MAX_MS = 12_000;

export const canRecord = () => typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";

function pickMime(): string | undefined {
  for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) if (MediaRecorder.isTypeSupported?.(m)) return m;
  return undefined;
}

/**
 * Voice assistant prototype. Tap the mic, say what was sold ("2 kg mango and 3 banana"), tap again.
 * The recording is transcribed on the server (Whisper), matched to the vendor's products, and the
 * matches are put on the bill automatically. Wrong match? Remove the chip.
 */
export function VoiceAssistant({ open, onClose, items, onAdd, onRemove }: {
  open: boolean;
  onClose: () => void;
  items: TodayItem[];
  onAdd: (hits: VoiceHit[]) => void;
  onRemove: (hit: VoiceHit) => void;
}) {
  const { t, lang } = useI18n();
  const [phase, setPhase] = useState<Phase>("idle");
  const [level, setLevel] = useState(0);
  const [secs, setSecs] = useState(0);
  const [heard, setHeard] = useState("");
  const [hits, setHits] = useState<VoiceHit[]>([]);
  const [error, setError] = useState("");
  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const raf = useRef(0);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ctx = useRef<AudioContext | null>(null);

  const cleanup = useCallback(() => {
    cancelAnimationFrame(raf.current);
    if (tick.current) clearInterval(tick.current);
    if (stopTimer.current) clearTimeout(stopTimer.current);
    stream.current?.getTracks().forEach((tr) => tr.stop());
    stream.current = null;
    void ctx.current?.close().catch(() => {});
    ctx.current = null;
    setLevel(0);
  }, []);

  useEffect(() => {
    if (!open) {
      if (rec.current?.state === "recording") rec.current.stop();
      cleanup();
      setPhase("idle");
      setHeard("");
      setHits([]);
      setError("");
    }
    return cleanup;
  }, [open, cleanup]);

  const understand = useCallback(
    async (blob: Blob) => {
      setPhase("thinking");
      try {
        const form = new FormData();
        form.set("audio", blob, "voice");
        form.set("lang", lang);
        const res = await fetch("/api/v1/voice/transcribe", { method: "POST", body: form });
        const json = (await res.json().catch(() => null)) as { data?: { text: string }; error?: { code: string; message: string } } | null;
        if (!res.ok || !json?.data) throw new ApiClientError(res.status, json?.error?.code ?? "INTERNAL", json?.error?.message ?? "Voice failed");
        const text = json.data.text;
        const found = parseSaleUtterance(text, items);
        setHeard(text);
        setHits(found);
        if (found.length) onAdd(found); // auto-select on the bill
        setPhase("done");
      } catch (e) {
        setError(!navigator.onLine || !(e instanceof ApiClientError) ? t("voice.offline") : e.status === 429 ? t("err.RATE_LIMITED") : t("voice.unavailable"));
        setPhase("error");
      }
    },
    [items, lang, onAdd, t],
  );

  const start = async () => {
    setError("");
    setHeard("");
    setHits([]);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      stream.current = s;
      chunks.current = [];
      const mime = pickMime();
      const r = new MediaRecorder(s, mime ? { mimeType: mime } : undefined);
      rec.current = r;
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = () => {
        const type = r.mimeType || mime || "audio/webm";
        cleanup();
        const blob = new Blob(chunks.current, { type });
        if (blob.size < 1500) {
          setError(t("voice.too_short"));
          setPhase("error");
        } else void understand(blob);
      };
      // level meter
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ac = new AC();
      ctx.current = ac;
      const an = ac.createAnalyser();
      an.fftSize = 256;
      ac.createMediaStreamSource(s).connect(an);
      const buf = new Uint8Array(an.frequencyBinCount);
      const loop = () => {
        an.getByteTimeDomainData(buf);
        let peak = 0;
        for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
        setLevel(Math.min(1, peak / 60));
        raf.current = requestAnimationFrame(loop);
      };
      loop();
      setSecs(0);
      tick.current = setInterval(() => setSecs((x) => x + 1), 1000);
      stopTimer.current = setTimeout(() => r.state === "recording" && r.stop(), MAX_MS);
      r.start();
      setPhase("recording");
    } catch (e) {
      cleanup();
      setError((e as DOMException)?.name === "NotAllowedError" ? t("voice.mic_denied") : t("voice.unsupported"));
      setPhase("error");
    }
  };

  const stop = () => {
    if (rec.current?.state === "recording") rec.current.stop();
  };

  const remove = (h: VoiceHit) => {
    onRemove(h);
    setHits((x) => x.filter((y) => y.item_id !== h.item_id));
  };
  const find = (id: string) => items.find((i) => i.id === id);
  const examples = lang === "ml" ? ["രണ്ട് കിലോ മാങ്ങ", "മൂന്ന് വാഴപ്പഴം", "അര കിലോ ആപ്പിൾ"] : ["2 kg mango", "3 banana", "half kg apple"];

  return (
    <BottomSheet dock open={open} onClose={onClose} title={t("voice.assistant")}>
      <div className="flex flex-col items-center gap-4 text-center">
        {/* mic button with live level ring */}
        <div className="relative grid size-32 place-items-center">
          <span aria-hidden className="absolute inset-0 rounded-full bg-primary/20 transition-transform duration-100" style={{ transform: `scale(${phase === "recording" ? 1 + level * 0.45 : 1})` }} />
          <button
            type="button"
            onClick={phase === "recording" ? stop : start}
            disabled={phase === "thinking"}
            aria-label={phase === "recording" ? t("voice.stop") : t("voice.start")}
            data-testid="voice-mic"
            className={cn("btn-press relative grid size-24 place-items-center rounded-full text-on-primary shadow-lg", phase === "recording" ? "bg-danger" : "bg-primary")}
          >
            {phase === "thinking" ? <Loader2 className="size-10 animate-spin" aria-hidden /> : phase === "recording" ? <Square className="size-9 fill-current" aria-hidden /> : <Mic className="size-10" aria-hidden />}
          </button>
        </div>

        <p className="min-h-7 text-lg font-semibold" aria-live="polite">
          {phase === "idle" && t("voice.tap_and_say")}
          {phase === "recording" && `${t("voice.listening")} ${secs}s`}
          {phase === "thinking" && t("voice.understanding")}
          {phase === "done" && (hits.length ? t("voice.added") : t("voice.no_match"))}
          {phase === "error" && <span className="text-danger">{error}</span>}
        </p>

        {phase === "idle" && (
          <div className="space-y-2">
            <p className="text-sm text-muted">{t("voice.try_saying")}</p>
            <ul className="flex flex-wrap justify-center gap-2">
              {examples.map((e) => <li key={e} className="rounded-full bg-surface-2 px-4 py-1.5 font-semibold">“{e}”</li>)}
            </ul>
          </div>
        )}

        {heard && <p className="card-2 w-full p-3 text-lg">“{heard}”</p>}

        {hits.length > 0 && (
          <ul className="flex w-full flex-wrap justify-center gap-2" data-testid="voice-hits">
            {hits.map((h) => {
              const it = find(h.item_id);
              if (!it) return null;
              return (
                <li key={h.item_id} className="inline-flex items-center gap-2 rounded-full bg-primary-soft py-1.5 pl-3 pr-1.5 text-lg font-bold">
                  <ItemEmoji emoji={it.emoji} name={it.name_en} className="text-2xl" />
                  <span className="num">{fmtQty(h.qty)} {t(`unit.${it.unit}`)}</span>
                  <span>{lang === "ml" ? it.name_ml : it.name_en}</span>
                  <button type="button" onClick={() => remove(h)} aria-label={`${t("common.remove")}: ${it.name_en}`} className="btn-press grid size-9 place-items-center rounded-full bg-surface"><X className="size-5" aria-hidden /></button>
                </li>
              );
            })}
          </ul>
        )}

        {(phase === "done" || phase === "error") && (
          <div className="flex w-full gap-3">
            <Button variant="outline" className="flex-1" onClick={start}><RotateCcw className="size-5" aria-hidden /> {t("voice.again")}</Button>
            <Button className="flex-1" onClick={onClose} data-testid="voice-done">{t("common.done")}</Button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
