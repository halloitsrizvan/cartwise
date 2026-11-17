// The one shared guard. Ownership ids (vendorId, marketId) always come from this session, never from a request body.
import type { Profile } from "@prisma/client";
import type { Role } from "@/shared/schemas/domain";
import { AppError } from "./errors";
import { prisma } from "./prisma";
import { createSupabaseServerClient } from "./supabase";

export async function getCurrentProfile(): Promise<{ profile: Profile; role: Role } | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const role = data.user.app_metadata?.role as Role | undefined;
  if (!role) return null;
  const profile = await prisma.profile.findUnique({ where: { id: data.user.id } });
  if (!profile || profile.role !== role) return null;
  return { profile, role };
}

export async function requireUser(): Promise<Profile> {
  const cur = await getCurrentProfile();
  if (!cur) throw AppError.unauthorized();
  return cur.profile;
}

/** Throws 401 when signed out, 403 when the role is not allowed. */
export async function requireRole(...roles: Role[]): Promise<Profile> {
  const profile = await requireUser();
  if (!roles.includes(profile.role as Role)) throw AppError.forbidden();
  return profile;
}
