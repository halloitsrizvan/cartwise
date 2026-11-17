"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { TopBar } from "@/components/cw/shell";
import { Button, Card, Field, Input } from "@/components/cw/ui";
import { api, ApiClientError } from "@/lib/api/client";
import { useT } from "@/lib/i18n";
import { LoginSchema, RegisterMarketSchema, RegisterVendorSchema } from "@/shared/schemas/domain";

type AuthResult = { role: "vendor" | "officer" | "market"; onboarded: boolean };

export function goHome(r: AuthResult, router: ReturnType<typeof useRouter>) {
  if (r.role === "vendor") router.replace(r.onboarded ? "/app" : "/onboarding");
  else router.replace(`/${r.role}`);
}

function useFieldErrors() {
  const t = useT();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fromZod = (e: z.ZodError) => {
    const out: Record<string, string> = {};
    for (const issue of e.issues) {
      const key = String(issue.path[0] ?? "form");
      const k = `err.${issue.message}`;
      const translated = t(k);
      out[key] = translated !== k ? translated : issue.code === "invalid_format" && key === "email" ? t("err.EMAIL_INVALID") : issue.code === "too_small" && key === "password" ? t("err.PASSWORD_SHORT") : t("err.REQUIRED");
    }
    setErrors(out);
  };
  return { errors, setErrors, fromZod };
}

export function useAuthSubmit() {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const run = async (path: string, body: unknown) => {
    setBusy(true);
    setFormError("");
    try {
      const r = await api<AuthResult>(path, { method: "POST", body });
      goHome(r, router);
    } catch (e) {
      const code = e instanceof ApiClientError ? e.code : "INTERNAL";
      const k = `err.${code}`;
      setFormError(t(k) !== k ? t(k) : t("common.error_body"));
      setBusy(false);
    }
  };
  return { busy, formError, run, setFormError };
}

export function DemoRow() {
  const t = useT();
  const { busy, formError, run } = useAuthSubmit();
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        {(["vendor", "officer", "market"] as const).map((role) => (
          <Button key={role} variant={role === "vendor" ? "accent" : "outline"} disabled={busy} onClick={() => run("/api/v1/auth/demo", { role })} data-testid={`demo-${role}`}>
            {t(`landing.demo_${role}`)}
          </Button>
        ))}
      </div>
      {formError && <p role="alert" className="mt-2 font-medium text-danger">{formError}</p>}
    </div>
  );
}

function usePublicConfig() {
  return useQuery({ queryKey: ["auth-config"], queryFn: () => api<{ demo_mode: boolean }>("/api/v1/auth/config"), staleTime: 300_000, retry: false });
}

export function LoginView() {
  const t = useT();
  const cfg = usePublicConfig();
  const [staff, setStaff] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [secret, setSecret] = useState("");
  const { errors, setErrors, fromZod } = useFieldErrors();
  const { busy, formError, run, setFormError } = useAuthSubmit();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const parsed = staff
      ? z.object({ identifier: z.email(), secret: z.string().min(8) }).safeParse({ identifier, secret })
      : z.object({ identifier: z.string().regex(/^\d{10}$/, "PHONE_INVALID"), secret: z.string().regex(/^\d{4,6}$/, "PIN_INVALID") }).safeParse({ identifier, secret });
    if (!parsed.success) {
      const fe = new Map<string, string>();
      parsed.error.issues.forEach((i) => fe.set(String(i.path[0]), i.message));
      const mapped: Record<string, string> = {};
      fe.forEach((m, k) => {
        const key = `err.${m}`;
        mapped[k] = t(key) !== key ? t(key) : k === "identifier" ? t("err.EMAIL_INVALID") : t("err.PASSWORD_SHORT");
      });
      setErrors(mapped);
      return;
    }
    setErrors({});
    void LoginSchema;
    run("/api/v1/auth/login", { identifier, secret });
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar />
      <main id="main" className="mx-auto w-full max-w-md flex-1 px-4 py-8">
        <h1 className="mb-4 text-3xl">{t("auth.login_title")}</h1>
        <div role="tablist" className="mb-4 grid grid-cols-2 gap-2 rounded-full bg-surface-2 p-1">
          {[false, true].map((s) => (
            <button key={String(s)} role="tab" aria-selected={staff === s} type="button" onClick={() => { setStaff(s); setIdentifier(""); setSecret(""); setErrors({}); }} className={`btn-press min-h-12 rounded-full font-semibold ${staff === s ? "bg-primary text-on-primary" : ""}`}>
              {s ? t("auth.staff_tab") : t("auth.vendor_tab")}
            </button>
          ))}
        </div>
        <Card>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <Field label={staff ? t("auth.email") : t("auth.phone")} error={errors.identifier} htmlFor="identifier">
              <Input id="identifier" name="identifier" inputMode={staff ? "email" : "numeric"} autoComplete={staff ? "email" : "tel"} type={staff ? "email" : "tel"} value={identifier} onChange={(e) => setIdentifier(e.target.value.trim())} maxLength={staff ? 120 : 10} aria-invalid={!!errors.identifier} />
            </Field>
            <Field label={staff ? t("auth.password") : t("auth.pin")} error={errors.secret} htmlFor="secret">
              <Input id="secret" name="secret" type="password" inputMode={staff ? "text" : "numeric"} autoComplete="current-password" value={secret} onChange={(e) => setSecret(e.target.value)} maxLength={staff ? 128 : 6} aria-invalid={!!errors.secret} />
            </Field>
            {formError && <p role="alert" className="font-medium text-danger">{formError}</p>}
            <Button type="submit" size="lg" className="w-full" loading={busy}>{t("auth.login")}</Button>
          </form>
        </Card>
        <p className="mt-4 text-center"><Link href="/register" className="font-semibold text-primary underline">{t("auth.no_account")}</Link></p>
        {cfg.data?.demo_mode && (
          <div className="mt-8">
            <h2 className="mb-3 text-xl">{t("auth.demo_title")}</h2>
            <DemoRow />
          </div>
        )}
      </main>
    </div>
  );
}

export function RegisterView() {
  const t = useT();
  const [market, setMarket] = useState(false);
  const [v, setV] = useState({ phone: "", pin: "" });
  const [m, setM] = useState({ email: "", password: "", name: "", market_name: "", area: "" });
  const { errors, setErrors, fromZod } = useFieldErrors();
  const { busy, formError, run, setFormError } = useAuthSubmit();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const res = market ? RegisterMarketSchema.safeParse(m) : RegisterVendorSchema.safeParse(v);
    if (!res.success) return fromZod(res.error);
    setErrors({});
    run(market ? "/api/v1/auth/register/market" : "/api/v1/auth/register/vendor", res.data);
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar />
      <main id="main" className="mx-auto w-full max-w-md flex-1 px-4 py-8">
        <h1 className="mb-4 text-3xl">{t("auth.register_title")}</h1>
        <div role="tablist" className="mb-4 grid grid-cols-2 gap-2 rounded-full bg-surface-2 p-1">
          {[false, true].map((s) => (
            <button key={String(s)} role="tab" aria-selected={market === s} type="button" onClick={() => { setMarket(s); setErrors({}); }} className={`btn-press min-h-12 rounded-full font-semibold ${market === s ? "bg-primary text-on-primary" : ""}`}>
              {s ? t("auth.market_register") : t("auth.vendor_tab")}
            </button>
          ))}
        </div>
        <Card>
          <form onSubmit={submit} className="space-y-4" noValidate>
            {!market ? (
              <>
                <Field label={t("auth.phone")} error={errors.phone} htmlFor="phone">
                  <Input id="phone" type="tel" inputMode="numeric" autoComplete="tel" maxLength={10} value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value.replace(/\D/g, "") })} aria-invalid={!!errors.phone} />
                </Field>
                <Field label={t("auth.pin")} error={errors.pin} htmlFor="pin">
                  <Input id="pin" type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={v.pin} onChange={(e) => setV({ ...v, pin: e.target.value.replace(/\D/g, "") })} aria-invalid={!!errors.pin} />
                </Field>
                <p className="text-muted">{t("auth.pin_note")}</p>
              </>
            ) : (
              <>
                <Field label={t("auth.your_name")} error={errors.name} htmlFor="mname"><Input id="mname" value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} /></Field>
                <Field label={t("auth.market_name")} error={errors.market_name} htmlFor="mmarket"><Input id="mmarket" value={m.market_name} onChange={(e) => setM({ ...m, market_name: e.target.value })} /></Field>
                <Field label={t("auth.area")} error={errors.area} htmlFor="marea"><Input id="marea" value={m.area} onChange={(e) => setM({ ...m, area: e.target.value })} /></Field>
                <Field label={t("auth.email")} error={errors.email} htmlFor="memail"><Input id="memail" type="email" autoComplete="email" value={m.email} onChange={(e) => setM({ ...m, email: e.target.value.trim() })} /></Field>
                <Field label={t("auth.password")} error={errors.password} htmlFor="mpass"><Input id="mpass" type="password" autoComplete="new-password" value={m.password} onChange={(e) => setM({ ...m, password: e.target.value })} /></Field>
                <p className="text-muted">{t("auth.market_pending")}</p>
              </>
            )}
            {formError && <p role="alert" className="font-medium text-danger">{formError}</p>}
            <Button type="submit" size="lg" className="w-full" loading={busy}>{t("auth.register")}</Button>
          </form>
        </Card>
        <p className="mt-4 text-center"><Link href="/login" className="font-semibold text-primary underline">{t("auth.have_account")}</Link></p>
      </main>
    </div>
  );
}
