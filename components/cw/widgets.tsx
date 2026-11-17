"use client";
import { Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { fmtQty, haptic } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Chip } from "./ui";

/** Press-and-hold repeating stepper. */
export function Stepper({ value, onChange, step = 1, min = 0, max = 100000, size = "md", label, unit }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; size?: "md" | "lg"; label: string; unit?: string }) {
  const { t } = useI18n();
  const valRef = useRef(value);
  valRef.current = value;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 1000) / 1000));
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const start = (dir: 1 | -1) => {
    let n = 0;
    const tick = () => {
      const mult = n > 12 ? 5 : n > 6 ? 2 : 1;
      const next = clamp(valRef.current + dir * step * mult);
      if (next !== valRef.current) {
        valRef.current = next;
        onChange(next);
        haptic(6);
      }
      n++;
      timer.current = setTimeout(tick, n < 2 ? 450 : 110);
    };
    tick();
  };
  useEffect(() => stop, []);
  const btn = cn("btn-press grid shrink-0 place-items-center rounded-full bg-primary-soft text-ink select-none touch-none", size === "lg" ? "size-16" : "size-14");
  return (
    <div className="flex items-center justify-between gap-2" role="group" aria-label={label}>
      <button type="button" className={btn} aria-label={`${t("common.decrease")} ${label}`} onPointerDown={(e) => { e.preventDefault(); start(-1); }} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChange(clamp(value - step)); } }}>
        <Minus className="size-7" aria-hidden />
      </button>
      <div className="min-w-[4.5rem] text-center">
        <span className={cn("num font-bold", size === "lg" ? "text-4xl" : "text-3xl")}>{fmtQty(value)}</span>
        {unit && <span className="ml-1 text-base text-muted">{unit}</span>}
      </div>
      <button type="button" className={btn} aria-label={`${t("common.increase")} ${label}`} onPointerDown={(e) => { e.preventDefault(); start(1); }} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChange(clamp(value + step)); } }}>
        <Plus className="size-7" aria-hidden />
      </button>
    </div>
  );
}

/** 600ms count-up (reduced-motion: jumps). */
export function CountUp({ value, prefix = "", className, duration = 600 }: { value: number; prefix?: string; className?: string; duration?: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(value);
      from.current = value;
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setShown(a + (value - a) * e);
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  const n = Math.round(shown);
  return (
    <span className={cn("num", className)} aria-label={`${prefix}${Math.round(value).toLocaleString("en-IN")}`}>
      {n < 0 ? "-" : ""}
      {prefix}
      {Math.abs(n).toLocaleString("en-IN")}
    </span>
  );
}

export function ItemEmoji({ emoji, name, className }: { emoji: string; name: string; className?: string }) {
  if (emoji) return <span className={cn("leading-none", className)} aria-hidden>{emoji}</span>;
  return (
    <span aria-hidden className={cn("grid aspect-square place-items-center rounded-full bg-primary-soft font-bold text-ink", className)} style={{ fontSize: "0.6em", width: "1.4em" }}>
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function StatCard({ label, value, sub, tone = "default", className }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "default" | "primary" | "danger" | "accent"; className?: string }) {
  const tones = {
    default: "card",
    primary: "card !bg-primary !text-on-primary",
    danger: "card",
    accent: "card !bg-accent !text-on-accent",
  };
  return (
    <div className={cn(tones[tone], "p-5", className)}>
      <p className={cn("text-base font-semibold", tone === "default" || tone === "danger" ? "text-muted" : "opacity-90")}>{label}</p>
      <p className={cn("num mt-1 text-4xl font-bold", tone === "danger" && "text-danger")}>{value}</p>
      {sub && <p className={cn("mt-1 text-base", tone === "default" || tone === "danger" ? "text-muted" : "opacity-90")}>{sub}</p>}
    </div>
  );
}

export function ConfidenceDots({ level }: { level: "low" | "medium" | "high" }) {
  const { t } = useI18n();
  const n = level === "high" ? 3 : level === "medium" ? 2 : 1;
  return (
    <span className="inline-flex items-center gap-1" role="img" aria-label={`${t("plan.confidence")}: ${t(`confidence.${level}`)}`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={cn("size-2.5 rounded-full", i < n ? "bg-primary" : "bg-line")} />
      ))}
    </span>
  );
}

export function ReasonChip({ code }: { code: string }) {
  const { t } = useI18n();
  const up = /UP|HIGH|BOOST/.test(code);
  return <Chip tone={code === "FEW_DATA" ? "muted" : up ? "soft" : "accent"}>{t(`reason.${code}`)}</Chip>;
}

/** low-high band with the recommended marker. Starts at zero. */
export function RangeBar({ low, high, rec }: { low: number; high: number; rec: number }) {
  const max = Math.max(high, rec, 1) * 1.15;
  const pos = (v: number) => `${Math.min(100, (v / max) * 100)}%`;
  return (
    <div className="relative h-3 w-full rounded-full bg-surface-2" role="img" aria-label={`${fmtQty(low)} - ${fmtQty(high)}`}>
      <div className="absolute inset-y-0 rounded-full bg-primary/35" style={{ left: pos(low), width: `calc(${pos(high)} - ${pos(low)})`, minWidth: 6 }} />
      <div className="absolute -top-1 h-5 w-1.5 -translate-x-1/2 rounded-full bg-primary" style={{ left: pos(rec) }} />
    </div>
  );
}

export function SuccessCheck() {
  return (
    <svg viewBox="0 0 64 64" className="pop size-24" role="img" aria-hidden>
      <circle cx="32" cy="32" r="30" fill="var(--primary)" />
      <path d="M18 33l9 9 19-20" fill="none" stroke="var(--on-primary)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="60" strokeDashoffset="60" style={{ animation: "draw 500ms 250ms ease forwards" }} />
    </svg>
  );
}

export function ProgressRing({ percent, size = 96, label }: { percent: number; size?: number; label?: string }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={label ?? `${percent}%`}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="11" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--primary)" strokeWidth="11" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)} style={{ transition: "stroke-dashoffset 600ms ease" }} />
      </svg>
      <span className="num absolute text-xl font-bold">{percent}%</span>
    </div>
  );
}
