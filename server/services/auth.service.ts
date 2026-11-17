import type { Role } from "@/shared/schemas/domain";
import { DEMO_ACCOUNTS } from "../config/demo";
import { AppError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { createSupabaseServerClient } from "../lib/supabase";
import { supabaseAdmin } from "../lib/supabase-admin";

async function signIn(email: string, password: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new AppError(401, "UNAUTHORIZED", "Invalid credentials");
  const role = data.user.app_metadata?.role as Role | undefined;
  const profile = role ? await prisma.profile.findUnique({ where: { id: data.user.id }, include: { vendor: true } }) : null;
  if (!role || !profile) {
    await supabase.auth.signOut();
    throw new AppError(401, "UNAUTHORIZED", "Invalid credentials");
  }
  return {
    role,
    name: profile.name,
    onboarded: role === "vendor" ? !!profile.vendor?.onboarded : true,
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
  login: (email: string, password: string) => signIn(email.trim().toLowerCase(), password),

  async registerVendor(emailIn: string, password: string) {
    const email = emailIn.trim().toLowerCase();
    if (await prisma.profile.findUnique({ where: { email } })) throw AppError.conflict("Account already exists");
    const id = await createAuthUser(email, password, "vendor");
    await prisma.profile.create({
      data: { id, role: "vendor", name: "", email, vendor: { create: { stallType: "fruit", area: "" } } },
    });
    return signIn(email, password);
  },

  async demo(role: Role) {
    if (process.env.DEMO_MODE !== "true") throw AppError.forbidden("Demo mode is off");
    const a = DEMO_ACCOUNTS[role];
    return signIn(a.identifier, a.secret);
  },

  async logout() {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    return { ok: true };
  },

  async changePassword(vendorId: string, email: string, current: string, next: string) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: current });
    if (error) throw new AppError(401, "UNAUTHORIZED", "Current password is wrong");
    const { error: e2 } = await supabaseAdmin().auth.admin.updateUserById(vendorId, { password: next });
    if (e2) throw new AppError(500, "INTERNAL", "Could not change password");
    return { ok: true };
  },
};
