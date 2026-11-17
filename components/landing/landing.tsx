"use client";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, ShieldCheck, ShoppingBasket } from "lucide-react";
import { TopBar } from "@/components/cw/shell";
import { ButtonLink, Card } from "@/components/cw/ui";
import { DemoRow } from "@/components/auth/auth-forms";
import { BestVendors } from "@/components/public/vendors";
import { api } from "@/lib/api/client";
import { useT } from "@/lib/i18n";
import { APP_NAME } from "@/config/brand";

/** Original inline-SVG hero: a vendor cart with an awning, fruit crates and a scale. */
function CartIllustration() {
  return (
    <svg viewBox="0 0 420 300" role="img" aria-label="Street vendor cart with fruit" className="mx-auto h-auto w-full max-w-md">
      <ellipse cx="210" cy="276" rx="170" ry="12" fill="var(--surface-2)" />
      {/* awning */}
      <path d="M60 96 L360 96 L338 40 L82 40 Z" fill="var(--primary)" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path key={i} d={`M${60 + i * 50} 96 L${85 + i * 50 - 3} 40 L${110 + i * 50 - 6} 40 L${110 + i * 50} 96 Z`} fill={i % 2 ? "var(--primary)" : "var(--accent)"} opacity={i % 2 ? 1 : 0.95} />
      ))}
      <path d="M60 96 q25 18 50 0 q25 18 50 0 q25 18 50 0 q25 18 50 0 q25 18 50 0 q25 18 50 0" fill="var(--accent)" />
      <rect x="74" y="96" width="6" height="150" rx="3" fill="var(--ink)" opacity="0.8" />
      <rect x="340" y="96" width="6" height="150" rx="3" fill="var(--ink)" opacity="0.8" />
      {/* counter */}
      <rect x="56" y="170" width="308" height="22" rx="8" fill="var(--ink)" opacity="0.85" />
      <rect x="66" y="192" width="288" height="62" rx="10" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
      <path d="M96 192 v62 M150 192 v62 M204 192 v62 M258 192 v62 M312 192 v62" stroke="var(--border)" strokeWidth="2" />
      {/* produce */}
      <circle cx="108" cy="158" r="14" fill="#F2A100" />
      <circle cx="132" cy="160" r="13" fill="#E8590C" />
      <circle cx="154" cy="156" r="14" fill="#F2A100" />
      <circle cx="120" cy="144" r="13" fill="#D9480F" />
      <path d="M186 164 q14 -34 30 0 q-15 8 -30 0z" fill="#F2C94C" />
      <path d="M214 164 q14 -34 30 0 q-15 8 -30 0z" fill="#E9B824" />
      <circle cx="270" cy="154" r="15" fill="#C92A2A" />
      <circle cx="296" cy="158" r="14" fill="#E03131" />
      <circle cx="282" cy="140" r="13" fill="#C92A2A" />
      <path d="M278 128 q4 -9 10 -8" stroke="#2B8A3E" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* scale */}
      <rect x="318" y="146" width="28" height="24" rx="6" fill="var(--primary)" />
      <circle cx="332" cy="158" r="7" fill="var(--bg)" />
      {/* wheels */}
      <circle cx="104" cy="262" r="20" fill="var(--ink)" />
      <circle cx="104" cy="262" r="9" fill="var(--bg)" />
      <circle cx="316" cy="262" r="20" fill="var(--ink)" />
      <circle cx="316" cy="262" r="9" fill="var(--bg)" />
      {/* price tag */}
      <rect x="170" y="206" width="80" height="34" rx="10" fill="var(--accent)" />
      <text x="210" y="229" textAnchor="middle" fontSize="18" fontWeight="800" fill="var(--on-accent)" fontFamily="var(--font-num)">₹ 90/kg</text>
    </svg>
  );
}

export function Landing() {
  const t = useT();
  const cfg = useQuery({ queryKey: ["auth-config"], queryFn: () => api<{ demo_mode: boolean }>("/api/v1/auth/config"), staleTime: 300_000, retry: false });
  const benefits = [
    { icon: ShoppingBasket, title: t("landing.b1_title"), body: t("landing.b1_body") },
    { icon: BarChart3, title: t("landing.b2_title"), body: t("landing.b2_body") },
    { icon: ShieldCheck, title: t("landing.b3_title"), body: t("landing.b3_body") },
  ];
  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar />
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16">
        <section className="my-4 grid items-center gap-6 rounded-[32px] bg-deep p-6 text-on-deep md:grid-cols-2 md:p-10">
          <div className="space-y-5">
            <h1 className="text-4xl leading-tight md:text-5xl">{t("landing.title")}</h1>
            <p className="text-xl opacity-85">{t("landing.sub")}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/register" size="lg" variant="accent">{t("landing.vendor_cta")}</ButtonLink>
              <ButtonLink href="/vendors" size="lg" variant="outline">{t("landing.find_cta")}</ButtonLink>
            </div>
          </div>
          <div className="rounded-[28px] bg-bg p-4"><CartIllustration /></div>
        </section>

        <section aria-label={t("landing.b1_title")} className="grid gap-4 md:grid-cols-3">
          {benefits.map((b) => (
            <Card key={b.title} className="space-y-2">
              <b.icon className="size-9 text-primary" aria-hidden />
              <h2 className="text-2xl">{b.title}</h2>
              <p className="text-muted">{b.body}</p>
            </Card>
          ))}
        </section>

        <section className="mt-10">
          <h2 className="mb-4 text-3xl">{t("landing.how_title")}</h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {["landing.s1", "landing.s2", "landing.s3"].map((k, i) => (
              <li key={k} className="card-2 flex items-center gap-4 p-5">
                <span className="num grid size-12 shrink-0 place-items-center rounded-full bg-accent text-2xl font-bold text-on-accent">{i + 1}</span>
                <span className="text-lg font-medium">{t(k)}</span>
              </li>
            ))}
          </ol>
        </section>

        <BestVendors />

        {cfg.data?.demo_mode && (
          <section className="mt-10">
            <h2 className="mb-3 text-2xl">{t("landing.demo_title")}</h2>
            <DemoRow />
          </section>
        )}
      </main>
      <footer className="border-t-[length:var(--bw)] border-line px-4 py-6 text-center text-muted">
        <p>
          <strong className="text-ink">{APP_NAME}</strong> · {t("landing.footer")}
        </p>
        <p className="mt-2"><a href="/login?role=staff" className="font-semibold text-primary underline">{t("landing.admin_link")}</a></p>
      </footer>
    </div>
  );
}
