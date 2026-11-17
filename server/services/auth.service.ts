import type { z } from "zod";
import type { RegisterMarketSchema, Role } from "@/shared/schemas/domain";
import { DEMO_ACCOUNTS, pinToPassword, vendorEmail } from "../config/demo";
import { AppError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { createSupabaseServerClient } from "../lib/supabase";
import { supabaseAdmin } from "../lib/supabase-admin";

const PHONE_RE = /^\+?(?:91)?[\s-]?(\d{10})$/;

function credentials(identifier: string, secret: string) {
  const m = PHONE_RE.exec(identifier.replace(/\s|-/g, ""));
  if (m) return { email: vendorEmail(m[1]), password: pinToPassword(secret), vendor: true };
  return { email: identifier.toLowerCase(), password: secret, vendor: false };
}

async function signIn(email: string, password: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new AppError(401, "UNAUTHORIZED", "Invalid credentials");
  const role = data.user.app_metadata?.role as Role | undefined;
  const profile = role ? await prisma.profile.findUnique({ where: { id: data.user.id }, include: { vendor: true, market: true } }) : null;
  if (!role || !profile) {
    await supabase.auth.signOut();
    throw new AppError(401, "UNAUTHORIZED", "Invalid credentials");
  }
  return {
    role,
    name: profile.name,
    onboarded: role === "vendor" ? !!profile.vendor?.onboarded : true,
    approved: role === "market" ? !!profile.market?.approved : undefined,
  };
}

async function createAuthUser(email: string, password: string, role: Role) {
  const { data, error } = await supabaseAdmin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role },
  });
  if (error || !data.user) {
    if (error?.message?.toLowerCase().includes("already")) throw AppError.conflict("Account already exists");
    console.error("[auth] createUser failed", error?.message);
    throw new AppError(500, "INTERNAL", "Could not create account");
  }
  return data.user.id;
}

export const authService = {
  login: (identifier: string, secret: string) => {
    const c = credentials(identifier, secret);
    return signIn(c.email, c.password);
  },

  async registerVendor(phone: string, pin: string) {
    const existing = await prisma.profile.findUnique({ where: { phone } });
    if (existing) throw AppError.conflict("Account already exists");
    const id = await createAuthUser(vendorEmail(phone), pinToPassword(pin), "vendor");
    await prisma.profile.create({
      data: { id, role: "vendor", name: "", phone, vendor: { create: { stallType: "fruit", area: "" } } },
    });
    return signIn(vendorEmail(phone), pinToPassword(pin));
  },

  async registerMarket(input: z.infer<typeof RegisterMarketSchema>) {
    const email = input.email.toLowerCase();
    if (await prisma.profile.findUnique({ where: { email } })) throw AppError.conflict("Account already exists");
    const id = await createAuthUser(email, input.password, "market");
    await prisma.profile.create({
      data: {
        id,
        role: "market",
        name: input.name,
        email,
        phone: input.phone,
        area: input.area,
        market: { create: { marketName: input.market_name, area: input.area, approved: false } },
      },
    });
    return signIn(email, input.password);
  },

  async demo(role: Role) {
    if (process.env.DEMO_MODE !== "true") throw AppError.forbidden("Demo mode is off");
    const a = DEMO_ACCOUNTS[role];
    const c = credentials(a.identifier, a.secret);
    return signIn(c.email, c.password);
  },

  async logout() {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    return { ok: true };
  },

  async changePin(vendorId: string, phone: string, current: string, next: string) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email: vendorEmail(phone), password: pinToPassword(current) });
    if (error) throw new AppError(401, "UNAUTHORIZED", "Current PIN is wrong");
    const { error: e2 } = await supabaseAdmin().auth.admin.updateUserById(vendorId, { password: pinToPassword(next) });
    if (e2) throw new AppError(500, "INTERNAL", "Could not change PIN");
    return { ok: true };
  },
};
