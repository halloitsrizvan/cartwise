// Postgres-backed fixed-window limiter (rate_limits table). Works across serverless instances.
import { AppError } from "./errors";
import { prisma } from "./prisma";

export async function rateLimit(key: string, limit: number, windowSec: number): Promise<void> {
  const now = new Date();
  const k = key.slice(0, 200);
  const row = await prisma.rateLimit.findUnique({ where: { key: k } });
  if (!row || row.windowStart.getTime() + windowSec * 1000 <= now.getTime()) {
    await prisma.rateLimit.upsert({
      where: { key: k },
      create: { key: k, windowStart: now, count: 1 },
      update: { windowStart: now, count: 1 },
    });
    return;
  }
  const updated = await prisma.rateLimit.update({ where: { key: k }, data: { count: { increment: 1 } } });
  if (updated.count > limit) {
    throw AppError.rateLimited(Math.max(1, Math.ceil((row.windowStart.getTime() + windowSec * 1000 - now.getTime()) / 1000)));
  }
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
