"use client";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, Check, FileCheck2, Mic, ShieldCheck, WifiOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DemoRow } from "@/components/auth/auth-forms";
import { LangToggle } from "@/components/cw/shell";
import { ButtonLink } from "@/components/cw/ui";
import { BestVendors } from "@/components/public/vendors";
import { APP_NAME } from "@/config/brand";
import { api } from "@/lib/api/client";
import { useT } from "@/lib/i18n";
import { CoinsIllustration, ListIllustration, PhoneMock, TabletMock } from "./mockups";

function Logo({ light }: { light?: boolean }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 font-heading text-xl font-extrabold sm:text-2xl ${light ? "text-on-deep" : "text-primary"}`} aria-label={APP_NAME}>
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-lg text-on-primary" aria-hidden>C</span>
      {APP_NAME}
    </Link>
  );
}

function EmailCta({ id }: { id: string }) {
  const t = useT();
  const router = useRouter();
  const [email, setEmail] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/register${email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ""}`);
      }}
      className="flex w-full max-w-xl flex-col gap-3 sm:flex-row"
    >
      <label htmlFor={id} className="sr-only">{t("auth.email")}</label>
      <input id={id} type="email" inputMode="email" autoComplete="email" placeholder={t("landing.email_placeholder")} value={email} onChange={(e) => setEmail(e.target.value)} className="min-h-14 min-w-0 flex-1 rounded-2xl sm:min-h-16 border-[length:var(--bw)] border-line bg-surface px-5 text-lg shadow-sm outline-none focus:border-primary" />
      <button type="submit" className="btn-press inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-6 sm:min-h-16 sm:px-8 text-lg font-bold text-on-primary hover:brightness-110">
        {t("landing.get_started")} <ArrowRight className="size-5" aria-hidden />
      </button>
    </form>
  );
}

export function Landing() {
  const t = useT();
  const cfg = useQuery({ queryKey: ["auth-config"], queryFn: () => api<{ demo_mode: boolean }>("/api/v1/auth/config"), staleTime: 300_000, retry: false });

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      {/* ---------- Header ---------- */}
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4 sm:py-4 md:px-8">
          <Logo />
          <nav aria-label={t("nav.main")} className="ml-8 hidden gap-6 font-semibold md:flex">
            <a href="#features" className="hover:text-primary">{t("landing.nav_features")}</a>
            <a href="#how" className="hover:text-primary">{t("landing.how_title")}</a>
            <a href="#vendors" className="hover:text-primary">{t("landing.best_title")}</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <LangToggle />
            <ButtonLink href="/login" size="sm" variant="outline">{t("auth.login")}</ButtonLink>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        {/* ---------- Hero ---------- */}
        <section className="relative overflow-hidden bg-gradient-to-b from-primary-soft via-primary-soft/50 to-bg pb-8 pt-24 md:pt-32">
          <div aria-hidden className="pointer-events-none absolute -right-24 top-10 size-[28rem] rounded-full bg-primary/10 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 md:px-8 lg:grid-cols-[1.05fr_1fr]">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-surface px-4 py-1.5 text-sm font-bold text-primary shadow-sm"><BadgeCheck className="size-4" aria-hidden /> {t("landing.eyebrow")}</span>
              <h1 className="text-[2.1rem] leading-[1.15] sm:text-5xl md:text-7xl">
                {t("landing.h1_a")}<br />
                <span className="relative inline-block text-primary">
                  {t("landing.h1_b")}
                  <svg aria-hidden viewBox="0 0 300 14" className="absolute -bottom-2 left-0 h-3 w-full" preserveAspectRatio="none"><path d="M3 9c60-8 140-8 294-2" stroke="var(--accent)" strokeWidth="6" strokeLinecap="round" fill="none" /></svg>
                </span>
              </h1>
              <p className="max-w-xl text-lg text-muted sm:text-xl">{t("landing.sub")}</p>
              <EmailCta id="hero-email" />
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-base font-semibold text-muted">
                {["landing.pt1", "landing.pt2", "landing.pt3"].map((k) => (
                  <span key={k} className="inline-flex items-center gap-1.5"><Check className="size-5 text-primary" aria-hidden /> {t(k)}</span>
                ))}
              </div>
            </div>

            <div className="relative mx-auto h-[25rem] w-full max-w-xl sm:h-[28rem] md:h-[32rem]">
              <TabletMock className="absolute right-0 top-4 hidden sm:block" />
              <PhoneMock className="absolute bottom-0 left-1/2 -translate-x-1/2 sm:left-4 sm:translate-x-0" />
              <div className="absolute -left-2 top-6 hidden rounded-2xl bg-surface p-3 shadow-lg sm:block" aria-hidden>
                <p className="text-xs font-semibold text-muted">{t("close.waste")}</p>
                <p className="num text-xl font-extrabold text-primary">−80%</p>
              </div>
            </div>
          </div>

          <div className="relative mx-auto mt-10 max-w-7xl px-4 md:px-8">
            <div className="card grid gap-0 divide-y-[length:var(--bw)] divide-line overflow-hidden !rounded-[28px] md:grid-cols-3 md:divide-x md:divide-y-0">
              {[["landing.b1_title", "landing.b1_body"], ["landing.b2_title", "landing.b2_body"], ["landing.b3_title", "landing.b3_body"]].map(([a, b]) => (
                <div key={a} className="p-6">
                  <h2 className="text-xl">{t(a)}</h2>
                  <p className="mt-1 text-muted">{t(b)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Features ---------- */}
        <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 md:px-8">
          <p className="text-center text-sm font-extrabold uppercase tracking-widest text-primary">{t("landing.feat_eyebrow")}</p>
          <h2 className="mx-auto mt-2 max-w-3xl text-center text-3xl sm:text-4xl md:text-5xl">{t("landing.feat_title")}</h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {[
              { title: "landing.fc1_title", sub: "landing.fc1_sub", pts: ["landing.fc1_p1", "landing.fc1_p2"], art: <ListIllustration /> },
              { title: "landing.fc2_title", sub: "landing.fc2_sub", pts: ["landing.fc2_p1", "landing.fc2_p2"], art: <CoinsIllustration /> },
            ].map((c) => (
              <article key={c.title} className="flex flex-col overflow-hidden rounded-[28px] bg-surface-2 p-6 sm:rounded-[32px] sm:p-8">
                <h3 className="text-2xl">{t(c.title)}</h3>
                <p className="mt-1 text-muted">{t(c.sub)}</p>
                <ul className="mt-4 space-y-2">
                  {c.pts.map((p) => (
                    <li key={p} className="flex items-start gap-3 text-lg"><Check className="mt-1 size-5 shrink-0 text-primary" aria-hidden /> {t(p)}</li>
                  ))}
                </ul>
                <div className="mt-6 h-56 w-full">{c.art}</div>
              </article>
            ))}
          </div>

          <div className="card mt-6 grid gap-6 p-6 sm:p-8 md:grid-cols-3">
            {[
              { i: Mic, a: "landing.m1_title", b: "landing.m1_body" },
              { i: WifiOff, a: "landing.m2_title", b: "landing.m2_body" },
              { i: ShieldCheck, a: "landing.m3_title", b: "landing.m3_body" },
            ].map((m) => (
              <div key={m.a} className="flex gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary"><m.i className="size-6" aria-hidden /></span>
                <div><h3 className="text-xl">{t(m.a)}</h3><p className="text-muted">{t(m.b)}</p></div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Highlight banner ---------- */}
        <section className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="relative overflow-hidden rounded-[28px] bg-deep p-6 pt-10 text-on-deep sm:rounded-[36px] sm:p-8 md:p-12">
            <span className="absolute left-8 top-0 -translate-y-1/2 rounded-xl bg-accent px-4 py-2 text-sm font-extrabold text-on-accent">{t("landing.banner_tag")}</span>
            <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
              <div className="space-y-4">
                <FileCheck2 className="size-10 text-accent" aria-hidden />
                <h2 className="text-3xl sm:text-4xl md:text-5xl">{t("landing.banner_title")}</h2>
                <p className="max-w-xl text-lg opacity-85 sm:text-xl">{t("landing.banner_body")}</p>
                <ButtonLink href="/register" size="md" variant="accent">{t("landing.banner_cta")}</ButtonLink>
              </div>
              <ul className="space-y-3 rounded-[28px] bg-primary p-6 text-on-primary">
                {["landing.bn1", "landing.bn2", "landing.bn3"].map((k) => (
                  <li key={k} className="flex items-center gap-4 text-lg font-semibold"><BadgeCheck className="size-7 shrink-0" aria-hidden /> {t(k)}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ---------- How it works ---------- */}
        <section id="how" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 md:px-8">
          <h2 className="mb-8 text-center text-3xl sm:text-4xl md:text-5xl">{t("landing.how_title")}</h2>
          <ol className="grid gap-5 md:grid-cols-3">
            {["landing.s1", "landing.s2", "landing.s3"].map((k, i) => (
              <li key={k} className="card flex flex-col gap-4 p-6">
                <span className="num grid size-14 place-items-center rounded-2xl bg-primary text-3xl font-extrabold text-on-primary">{i + 1}</span>
                <p className="text-xl font-bold">{t(k)}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- Best vendors ---------- */}
        <div id="vendors" className="mx-auto -mt-6 max-w-7xl scroll-mt-20 px-4 pb-4 md:px-8">
          <BestVendors />
        </div>

        {cfg.data?.demo_mode && (
          <section className="mx-auto mt-12 max-w-3xl px-4">
            <h2 className="mb-3 text-center text-2xl">{t("landing.demo_title")}</h2>
            <DemoRow />
          </section>
        )}

        {/* ---------- Final CTA ---------- */}
        <section className="mx-auto mt-16 max-w-7xl px-4 md:px-8">
          <div className="relative overflow-hidden rounded-[28px] bg-primary-soft p-6 sm:rounded-[36px] sm:p-8 md:p-12">
            <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
              <div className="space-y-6">
                <h2 className="text-3xl sm:text-4xl md:text-5xl">{t("landing.cta_title", { app: APP_NAME })}</h2>
                <EmailCta id="cta-email" />
                <p className="text-muted">{t("landing.cta_note")}</p>
              </div>
              <div className="relative hidden h-72 overflow-hidden lg:block"><PhoneMock className="absolute left-1/2 top-4 -translate-x-1/2 rotate-3" /></div>
            </div>
          </div>
        </section>
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="mt-16 bg-surface-2">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:px-8">
          <div className="space-y-3">
            <Logo />
            <p className="max-w-sm text-lg">{t("landing.footer_blurb")}</p>
            <p className="text-sm text-muted">{t("landing.footer")}</p>
          </div>
          <nav aria-label={t("landing.fcol1")}>
            <h3 className="mb-3 text-lg">{t("landing.fcol1")}</h3>
            <ul className="space-y-2">
              <li><a className="hover:text-primary" href="#features">{t("landing.nav_features")}</a></li>
              <li><a className="hover:text-primary" href="#how">{t("landing.how_title")}</a></li>
            </ul>
          </nav>
          <nav aria-label={t("landing.fcol2")}>
            <h3 className="mb-3 text-lg">{t("landing.fcol2")}</h3>
            <ul className="space-y-2">
              <li><Link className="hover:text-primary" href="/register">{t("auth.register")}</Link></li>
              <li><Link className="hover:text-primary" href="/login">{t("auth.login")}</Link></li>
            </ul>
          </nav>
          <nav aria-label={t("landing.fcol3")}>
            <h3 className="mb-3 text-lg">{t("landing.fcol3")}</h3>
            <ul className="space-y-2">
              <li><Link className="hover:text-primary" href="/vendors">{t("landing.find_cta")}</Link></li>
              <li><Link className="hover:text-primary" href="/login">{t("landing.admin_link")}</Link></li>
            </ul>
          </nav>
        </div>
        <div className="border-t-[length:var(--bw)] border-line py-4 text-center text-sm text-muted">© {APP_NAME}</div>
      </footer>
    </div>
  );
}

