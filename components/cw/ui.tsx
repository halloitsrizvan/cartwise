"use client";
import Link from "next/link";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { haptic } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Variant = "primary" | "accent" | "soft" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:brightness-110",
  accent: "bg-accent text-on-accent hover:brightness-105",
  soft: "bg-primary-soft text-ink hover:brightness-95",
  outline: "bg-surface text-ink border-[length:var(--bw)] border-line hover:bg-surface-2",
  ghost: "bg-transparent text-ink hover:bg-surface-2",
  danger: "bg-danger text-white hover:brightness-110",
};
const SIZES: Record<Size, string> = {
  sm: "min-h-11 px-4 text-base",
  md: "min-h-14 px-6 text-lg",
  lg: "min-h-16 px-8 text-xl",
};
export const buttonClass = (variant: Variant = "primary", size: Size = "md", extra?: string) =>
  cn(
    "btn-press inline-flex items-center justify-center gap-2 rounded-full font-semibold select-none disabled:opacity-50 disabled:pointer-events-none",
    VARIANTS[variant],
    SIZES[size],
    extra,
  );

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean; tick?: boolean };
export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { variant, size, loading, tick = true, className, children, onClick, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass(variant, size, className)}
      onClick={(e) => {
        if (tick) haptic();
        onClick?.(e);
      }}
      {...rest}
    >
      {loading && <Loader2 className="size-5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

export function ButtonLink({ href, variant, size, className, children, ...rest }: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  const external = /^(tel:|https?:|mailto:)/.test(href);
  const cls = buttonClass(variant, size, className);
  return external ? (
    <a href={href} className={cls} {...rest}>
      {children}
    </a>
  ) : (
    <Link href={href} className={cls} {...rest}>
      {children}
    </Link>
  );
}

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("card p-5", className)} {...rest}>
      {children}
    </div>
  );
}

export function Chip({ children, tone = "soft", className }: { children: ReactNode; tone?: "soft" | "accent" | "danger" | "muted"; className?: string }) {
  const tones = {
    soft: "bg-primary-soft text-ink",
    accent: "bg-accent text-on-accent",
    danger: "bg-danger text-white",
    muted: "bg-surface-2 text-muted",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold", tones[tone], className)}>{children}</span>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton h-6 w-full", className)} />;
}
export function ListSkeleton({ rows = 3, h = "h-24" }: { rows?: number; h?: string }) {
  return (
    <div className="space-y-3" role="status" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={cn(h, "rounded-[24px]")} />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function EmptyState({ title, body, action, icon }: { title: string; body?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="card-2 flex flex-col items-center gap-3 p-8 text-center">
      <div className="text-muted">{icon ?? <Inbox className="size-12" aria-hidden />}</div>
      <h3 className="text-xl">{title}</h3>
      {body && <p className="text-muted">{body}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const t = useT();
  return (
    <div role="alert" className="card flex flex-col items-center gap-3 p-8 text-center">
      <AlertTriangle className="size-10 text-danger" aria-hidden />
      <h3 className="text-xl">{t("common.error_title")}</h3>
      <p className="text-muted">{message ?? t("common.error_body")}</p>
      {onRetry && (
        <Button variant="primary" onClick={onRetry}>
          {t("common.retry")}
        </Button>
      )}
    </div>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-4">
      <h1 className="text-[1.65rem] leading-tight">{children}</h1>
      {sub && <p className="mt-1 text-muted">{sub}</p>}
    </div>
  );
}

export function Field({ label, error, children, htmlFor }: { label: string; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-base font-semibold">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass =
  "w-full min-h-14 rounded-[16px] border-[length:var(--bw)] border-line bg-surface px-4 text-lg text-ink placeholder:text-muted focus:border-primary outline-none";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn(inputClass, className)} {...p} />;
});

export function Toggle({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; id?: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => {
        haptic();
        onChange(!checked);
      }}
      className={cn("btn-press relative h-9 w-16 shrink-0 rounded-full border-[length:var(--bw)] transition-colors", checked ? "border-primary bg-primary" : "border-line bg-surface-2")}
    >
      <span className={cn("absolute top-1 size-7 rounded-full bg-white shadow transition-all", checked ? "left-8" : "left-1", !checked && "border border-line")} />
    </button>
  );
}
