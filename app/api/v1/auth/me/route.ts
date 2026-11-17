import { ok, route } from "@/server/lib/route";
import { prisma } from "@/server/lib/prisma";

export const GET = route({ auth: true }, async ({ user }) => {
  const p = await prisma.profile.findUnique({ where: { id: user!.id }, include: { vendor: true } });
  return ok({
    id: user!.id,
    role: user!.role,
    name: user!.name,
    language: user!.language,
    onboarded: user!.role === "vendor" ? !!p?.vendor?.onboarded : true,
    demo: process.env.DEMO_MODE === "true",
  });
});
