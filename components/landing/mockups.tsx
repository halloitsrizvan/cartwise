"use client";
/** Original product mockups drawn in markup (no screenshots, no third-party art). */
import { useI18n } from "@/lib/i18n";

const ROWS = [
  { e: "🥭", ml: "മാങ്ങ", en: "Mango", q: "12.5", u: "kg", tag: "up" },
  { e: "🍌", ml: "വാഴപ്പഴം", en: "Banana", q: "20.5", u: "kg", tag: "up" },
  { e: "🍎", ml: "ആപ്പിൾ", en: "Apple", q: "6", u: "kg", tag: "rain" },
  { e: "🍊", ml: "ഓറഞ്ച്", en: "Orange", q: "8", u: "kg", tag: "up" },
];

export function PhoneMock({ className = "" }: { className?: string }) {
  const { lang, t } = useI18n();
  return (
    <div className={`relative w-56 rounded-[2.2rem] sm:w-[15.5rem] sm:rounded-[2.4rem] border-[7px] border-deep bg-bg p-3 shadow-[0_30px_60px_-20px_rgba(3,39,36,0.45)] ${className}`} aria-hidden>
      <div className="mx-auto mb-3 h-5 w-20 rounded-full bg-deep" />
      <p className="text-[0.7rem] font-semibold text-muted">{t("plan.hint")}</p>
      <p className="mb-2 text-lg font-extrabold leading-tight">{t("plan.title", { day: t("wd.3") })}</p>
      <div className="mb-3 rounded-2xl bg-primary p-3 text-on-primary">
        <p className="text-[0.65rem] opacity-90">{t("plan.expected")}</p>
        <p className="num text-2xl font-extrabold">₹2,840</p>
      </div>
      <ul className="space-y-2">
        {ROWS.map((r) => (
          <li key={r.en} className="flex items-center gap-2 rounded-2xl bg-surface p-2 shadow-sm">
            <span className="text-2xl">{r.e}</span>
            <span className="flex-1 text-xs font-bold">{lang === "ml" ? r.ml : r.en}</span>
            <span className="text-right">
              <span className="num block text-lg font-extrabold leading-none text-primary">{r.q}</span>
              <span className="text-[0.6rem] text-muted">{r.u}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 h-10 rounded-full bg-accent" />
    </div>
  );
}

export function TabletMock({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const bars = [38, 52, 44, 61, 58, 72, 80];
  return (
    <div className={`w-[26rem] max-w-full rounded-[1.6rem] border-[8px] border-deep bg-bg p-4 shadow-[0_30px_60px_-24px_rgba(3,39,36,0.4)] ${className}`} aria-hidden>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-extrabold">{t("money.title")}</p>
        <span className="rounded-full bg-primary-soft px-3 py-0.5 text-[0.65rem] font-bold">{t("money.week")}</span>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-surface p-3">
          <p className="text-[0.65rem] text-muted">{t("money.profit")}</p>
          <p className="num text-2xl font-extrabold text-primary">₹9,420</p>
        </div>
        <div className="rounded-2xl bg-surface p-3">
          <p className="text-[0.65rem] text-muted">{t("money.waste_card")}</p>
          <p className="num text-2xl font-extrabold text-danger">₹310</p>
        </div>
      </div>
      <div className="flex h-28 items-end gap-2 rounded-2xl bg-surface p-3">
        {bars.map((h, i) => (
          <span key={i} className={`flex-1 rounded-t-lg ${i > 2 ? "bg-primary" : "bg-gut"}`} style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

/** Feature-card illustration: a buy-list sheet with a check and an alarm clock. */
export function ListIllustration() {
  return (
    <svg viewBox="0 0 360 220" className="h-full w-full" role="img" aria-label="Buy list with a check mark" fill="none">
      <rect x="40" y="40" width="190" height="150" rx="18" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
      <rect x="62" y="68" width="110" height="12" rx="6" fill="var(--primary-soft)" />
      <rect x="62" y="96" width="140" height="12" rx="6" fill="var(--surface-2)" />
      <rect x="62" y="124" width="100" height="12" rx="6" fill="var(--surface-2)" />
      <rect x="62" y="152" width="124" height="12" rx="6" fill="var(--surface-2)" />
      <circle cx="226" cy="58" r="30" fill="var(--primary)" />
      <path d="M212 58l10 10 18-20" stroke="var(--on-primary)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="298" cy="120" r="34" fill="var(--accent)" />
      <circle cx="298" cy="120" r="24" fill="var(--bg)" />
      <path d="M298 106v15l10 7" stroke="var(--deep)" strokeWidth="5" strokeLinecap="round" />
      <path d="M268 84l-10-10M328 84l10-10" stroke="var(--deep)" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

/** Feature-card illustration: stacked coins and a rising bar chart. */
export function CoinsIllustration() {
  return (
    <svg viewBox="0 0 360 220" className="h-full w-full" role="img" aria-label="Rising profit chart with coins" fill="none">
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={50 + i * 56} y={170 - (30 + i * 24)} width="40" height={30 + i * 24} rx="10" fill={i > 1 ? "var(--primary)" : "var(--gut)"} />
      ))}
      <path d="M62 120l56-26 56 8 56-44 56-22" stroke="var(--deep)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 10" />
      <ellipse cx="300" cy="176" rx="40" ry="12" fill="var(--accent)" />
      <ellipse cx="300" cy="164" rx="40" ry="12" fill="var(--accent)" stroke="var(--deep)" strokeWidth="2" />
      <ellipse cx="300" cy="152" rx="40" ry="12" fill="var(--accent)" stroke="var(--deep)" strokeWidth="2" />
      <text x="300" y="157" textAnchor="middle" fontSize="14" fontWeight="800" fill="var(--deep)">₹</text>
    </svg>
  );
}
