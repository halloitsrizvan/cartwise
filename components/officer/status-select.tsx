"use client";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const STATUSES = ["draft", "submitted", "approved", "rejected"] as const;

export function StatusSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useI18n();
  return (
    <div role="radiogroup" aria-label={t("officer.status")} className="flex flex-wrap gap-2">
      {STATUSES.map((s) => (
        <button key={s} type="button" role="radio" aria-checked={value === s} onClick={() => onChange(s)} className={cn("btn-press min-h-12 rounded-full border-[length:var(--bw)] border-line px-4 font-semibold", value === s ? "bg-primary text-on-primary" : "bg-surface")}>
          {t(`officer.status_${s}`)}
        </button>
      ))}
    </div>
  );
}
