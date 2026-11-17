"use client";
import { Bot, Loader2, RotateCcw, Send, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, ApiClientError } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string; sources?: { id: string; title: string }[] };
const KEY = "cw-chat";

const clean = (s: string) => s.replace(/\*\*/g, "").replace(/^#+\s*/gm, "").replace(/`/g, "");

/** Floating assistant (RAG over the app guide + the signed-in vendor's data) on every page. */
export function ChatWidget() {
  const { t, lang } = useI18n();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KEY);
      if (saved) setMsgs(JSON.parse(saved));
    } catch {
      /* storage blocked */
    }
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(msgs.slice(-20)));
    } catch {
      /* ignore */
    }
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy, open]);
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const send = async (text: string) => {
    const q = text.trim().slice(0, 800);
    if (!q || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: q }];
    setMsgs(next);
    setInput("");
    setError("");
    setBusy(true);
    try {
      const r = await api<{ reply: string; sources: { id: string; title: string }[] }>("/api/v1/chat", {
        method: "POST",
        body: { lang, messages: next.slice(-10).map((m) => ({ role: m.role, content: m.content })) },
      });
      setMsgs([...next, { role: "assistant", content: clean(r.reply), sources: r.sources.slice(0, 3) }]);
    } catch (e) {
      setError(e instanceof ApiClientError ? (e.status === 429 ? t("err.RATE_LIMITED") : t("chat.unavailable")) : t("chat.offline"));
    }
    setBusy(false);
  };

  const starters = [t("chat.q1"), t("chat.q2"), t("chat.q3"), t("chat.q4")];
  // on vendor screens (mobile) sit above the tab bar and the bill / total bars
  const inApp = path.startsWith("/app");

  return (
    <div className="no-print">
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("chat.open")}
          data-testid="chat-open"
          className={cn("btn-press fixed right-4 z-40 grid size-14 place-items-center rounded-full bg-deep text-on-deep shadow-xl ring-4 ring-primary/30 md:bottom-6 md:right-6", inApp ? "bottom-40" : "bottom-5")}
        >
          <Bot className="size-7" aria-hidden />
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-label={t("chat.title")}
          data-testid="chat-panel"
          className="fixed inset-x-3 bottom-3 z-50 flex h-[min(34rem,calc(100dvh-1.5rem))] flex-col overflow-hidden rounded-[28px] border-[length:var(--bw)] border-line bg-surface text-ink shadow-2xl sm:inset-x-auto sm:right-5 sm:w-[24rem] md:bottom-6 md:right-6"
        >
          <header className="flex items-center gap-3 bg-deep px-4 py-3 text-on-deep">
            <span className="grid size-10 place-items-center rounded-full bg-primary text-on-primary"><Bot className="size-6" aria-hidden /></span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg leading-tight">{t("chat.title")}</h2>
              <p className="text-xs opacity-80">{t("chat.sub")}</p>
            </div>
            {msgs.length > 0 && (
              <button type="button" onClick={() => { setMsgs([]); setError(""); }} aria-label={t("chat.clear")} className="btn-press grid size-10 place-items-center rounded-full hover:bg-white/10"><RotateCcw className="size-5" aria-hidden /></button>
            )}
            <button type="button" onClick={() => setOpen(false)} aria-label={t("common.close")} className="btn-press grid size-10 place-items-center rounded-full hover:bg-white/10"><X className="size-6" aria-hidden /></button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {msgs.length === 0 && (
              <div className="space-y-3">
                <p className="rounded-2xl bg-surface-2 p-3 text-lg">{t("chat.hello")}</p>
                <div className="flex flex-wrap gap-2">
                  {starters.map((q) => (
                    <button key={q} type="button" onClick={() => send(q)} className="btn-press rounded-full border-[length:var(--bw)] border-line bg-surface px-4 py-2 text-left font-semibold hover:bg-surface-2">{q}</button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[88%] whitespace-pre-wrap rounded-3xl px-4 py-2.5 text-[1.02rem] leading-relaxed", m.role === "user" ? "rounded-br-lg bg-primary text-on-primary" : "rounded-bl-lg bg-surface-2")}>
                  {m.content}
                  {m.role === "assistant" && m.sources && m.sources.length > 0 && (
                    <p className="mt-2 border-t-[length:var(--bw)] border-line pt-1.5 text-xs text-muted">{t("chat.sources")}: {m.sources.map((s) => s.title).join(" · ")}</p>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-muted" role="status"><Loader2 className="size-5 animate-spin" aria-hidden /> {t("chat.thinking")}</div>
            )}
            {error && <p role="alert" className="font-medium text-danger">{error}</p>}
            <div ref={endRef} />
          </div>

          <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="flex items-center gap-2 border-t-[length:var(--bw)] border-line p-3">
            <label htmlFor="chat-input" className="sr-only">{t("chat.placeholder")}</label>
            <input id="chat-input" ref={inputRef} value={input} maxLength={800} onChange={(e) => setInput(e.target.value)} placeholder={t("chat.placeholder")} className="min-h-12 min-w-0 flex-1 rounded-full border-[length:var(--bw)] border-line bg-bg px-4 text-base outline-none focus:border-primary" />
            <button type="submit" disabled={busy || !input.trim()} aria-label={t("chat.send")} className="btn-press grid size-12 shrink-0 place-items-center rounded-full bg-primary text-on-primary disabled:opacity-50"><Send className="size-5" aria-hidden /></button>
          </form>
        </section>
      )}
    </div>
  );
}
