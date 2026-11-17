"use client";
import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "./ui";

/** `dock`: compact panel glued to the very bottom edge on every screen size (used for quick pickers). */
export function BottomSheet({ open, onClose, title, children, footer, dock }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; dock?: boolean }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector<HTMLElement>("[data-autofocus],input,button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className={cn("fixed inset-0 z-50 flex items-end justify-center", !dock && "sm:items-center")}>
      <div className="fade-in absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn("sheet-in relative max-h-[92dvh] w-full overflow-y-auto bg-surface text-ink shadow-2xl", dock ? "max-w-2xl rounded-t-[28px] p-4 pb-5" : "max-w-lg rounded-t-[32px] p-5 pb-8 sm:rounded-[32px]")}
        style={{ paddingBottom: dock ? "max(1.25rem, env(safe-area-inset-bottom))" : "max(2rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-line sm:hidden" aria-hidden />
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className={dock ? "text-xl" : "text-2xl"}>{title}</h2>
          <button type="button" onClick={onClose} aria-label={t("common.close")} className="btn-press tap-target -mr-2 -mt-2 grid place-items-center rounded-full hover:bg-surface-2">
            <X className="size-6" aria-hidden />
          </button>
        </div>
        {children}
        {footer && <div className="mt-5">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** "2 kg mango: Add / Cancel" style confirmation. */
export function ConfirmSheet({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  danger,
  children,
}: {
  open: boolean;
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  children?: ReactNode;
}) {
  const t = useT();
  return (
    <BottomSheet
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            {cancelLabel ?? t("common.cancel")}
          </Button>
          <Button variant={danger ? "danger" : "primary"} className="flex-1" onClick={onConfirm} data-autofocus>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      {body && <div className="text-lg">{body}</div>}
      {children}
    </BottomSheet>
  );
}
