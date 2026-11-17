"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { z } from "zod";
import { TopBar } from "@/components/cw/shell";
import { Button, Card, Field, Input } from "@/components/cw/ui";
import { api, ApiClientError } from "@/lib/api/client";
import { useT } from "@/lib/i18n";
import { LoginSchema, RegisterVendorSchema } from "@/shared/schemas/domain";

type AuthResult = { role: "vendor" | "admin"; onboarded: boolean };

export function goHome(r: AuthResult, router: ReturnType<typeof useRouter>) {
  if (r.role === "vendor") router.replace(r.onboarded ? "/app" : "/onboarding");
  else router.replace("/admin");
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
      out[key] = translated !== k ? translated : t("err.REQUIRED");
    }
    setErrors(out);
  };
  return { errors, setErrors, fromZod };
}

export function useAuthSubmit() {
  const t = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const run = async (path: string, body: unknown) => {
    setBusy(true);
    setFormError("");
    try {
      const r = await api<AuthResult>(path, { method: "POST", body });
      await qc.invalidateQueries({ queryKey: ["me"] });
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
      <div className="grid gap-3 sm:grid-cols-2">
        {(["vendor", "admin"] as const).map((role) => (
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { errors, setErrors, fromZod } = useFieldErrors();
  const { busy, formError, run, setFormError } = useAuthSubmit();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const parsed = LoginSchema.safeParse({ email, password });
    if (!parsed.success) return fromZod(parsed.error);
    setErrors({});
    run("/api/v1/auth/login", parsed.data);
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar />
      <main id="main" className="mx-auto w-full max-w-md flex-1 px-4 py-8">
        <h1 className="mb-5 text-3xl">{t("auth.login_title")}</h1>
        <Card>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <Field label={t("auth.email")} error={errors.email} htmlFor="email">
              <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value.trim())} maxLength={120} aria-invalid={!!errors.email} />
            </Field>
            <Field label={t("auth.password")} error={errors.password} htmlFor="password">
              <Input id="password" name="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={128} aria-invalid={!!errors.password} />
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
  const [v, setV] = useState({ email: "", password: "" });
  const { errors, setErrors, fromZod } = useFieldErrors();
  const { busy, formError, run, setFormError } = useAuthSubmit();

  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get("email");
    if (e) setV((x) => ({ ...x, email: e }));
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const res = RegisterVendorSchema.safeParse(v);
    if (!res.success) return fromZod(res.error);
    setErrors({});
    run("/api/v1/auth/register/vendor", res.data);
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar />
      <main id="main" className="mx-auto w-full max-w-md flex-1 px-4 py-8">
        <h1 className="mb-1 text-3xl">{t("auth.register_title")}</h1>
        <p className="mb-5 text-muted">{t("auth.register_sub")}</p>
        <Card>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <Field label={t("auth.email")} error={errors.email} htmlFor="email">
              <Input id="email" type="email" inputMode="email" autoComplete="email" maxLength={120} value={v.email} onChange={(e) => setV({ ...v, email: e.target.value.trim() })} aria-invalid={!!errors.email} />
            </Field>
            <Field label={t("auth.password")} error={errors.password} htmlFor="password">
              <Input id="password" type="password" autoComplete="new-password" maxLength={128} value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} aria-invalid={!!errors.password} />
            </Field>
            <p className="text-muted">{t("auth.pin_note")}</p>
            {formError && <p role="alert" className="font-medium text-danger">{formError}</p>}
            <Button type="submit" size="lg" className="w-full" loading={busy}>{t("auth.register")}</Button>
          </form>
        </Card>
        <p className="mt-4 text-center"><Link href="/login" className="font-semibold text-primary underline">{t("auth.have_account")}</Link></p>
      </main>
    </div>
  );
}
