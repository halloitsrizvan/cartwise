import { createHash, randomBytes } from "node:crypto";
import { APP_NAME } from "@/config/brand";
import { RATE, SHARE_DEFAULT_DAYS } from "../config/constants";
import { audit } from "../lib/audit";
import { fromDbDate, todayIST } from "../lib/dates";
import { AppError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { rateLimit } from "../lib/rate-limit";
import { dayRepository } from "../repositories/day.repository";
import { vendorRepository } from "../repositories/vendor.repository";
import { isDemoPhone } from "./dto";
import { loadDayRecords } from "./money.service";
import { passportStats, readiness, type SelfDeclared } from "./passport";

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

async function statsFor(vendorId: string) {
  const [records, first] = await Promise.all([loadDayRecords(vendorId), dayRepository.firstLog(vendorId)]);
  return passportStats(
    records.map((r) => ({ date: r.date, profit: r.profit })),
    first ? fromDbDate(first.date) : null,
    todayIST(),
  );
}

async function getRegistration(vendorId: string) {
  return prisma.registration.upsert({
    where: { vendorId_scheme: { vendorId, scheme: "pm_svanidhi" } },
    create: { vendorId, scheme: "pm_svanidhi" },
    update: {},
  });
}

export const passportService = {
  async statement(vendorId: string) {
    const v = await vendorRepository.getWithProfile(vendorId);
    if (!v) throw AppError.notFound("Vendor not found");
    const s = await statsFor(vendorId);
    return {
      name: v.profile.name,
      stall_type: v.stallType,
      period_from: s.periodFrom,
      period_to: s.periodTo,
      avg_daily_profit: s.avgDailyProfit,
      active_days: s.activeDays,
      logged_days: s.loggedDays,
      closed_ratio: s.closedRatio,
      consistency: s.consistency,
      generated_at: new Date().toISOString(),
      generated_by: APP_NAME,
      demo: process.env.DEMO_MODE === "true" && isDemoPhone(v.profile.phone),
    };
  },

  async readiness(vendorId: string) {
    const [s, reg] = await Promise.all([statsFor(vendorId), getRegistration(vendorId)]);
    const r = readiness(s, reg.selfDeclared as SelfDeclared);
    return { ...r, registration_status: reg.status, indicative: true };
  },

  async setSelfDeclared(vendorId: string, patch: SelfDeclared) {
    const reg = await getRegistration(vendorId);
    const merged = { ...(reg.selfDeclared as SelfDeclared), ...patch };
    await prisma.registration.update({ where: { id: reg.id }, data: { selfDeclared: merged, updatedBy: vendorId } });
    return this.readiness(vendorId);
  },

  async createShare(vendorId: string, days?: number) {
    await rateLimit(`share:${vendorId}`, RATE.shareCreate.limit, RATE.shareCreate.windowSec);
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + (days ?? SHARE_DEFAULT_DAYS) * 86_400_000);
    const link = await prisma.shareLink.create({ data: { vendorId, tokenHash: hashToken(token), expiresAt } });
    await audit(vendorId, "share.create", "share_link", link.id, { expires_at: expiresAt.toISOString() });
    const base = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
    return { id: link.id, url: `${base}/p/${token}`, expires_at: expiresAt.toISOString() }; // token is shown once
  },

  async listShares(vendorId: string) {
    const links = await prisma.shareLink.findMany({ where: { vendorId }, orderBy: { createdAt: "desc" }, take: 20 });
    const now = new Date();
    return links.map((l) => ({
      id: l.id,
      created_at: l.createdAt.toISOString(),
      expires_at: l.expiresAt.toISOString(),
      active: !l.revokedAt && l.expiresAt > now,
    }));
  },

  async revokeShare(vendorId: string, id: string) {
    const res = await prisma.shareLink.updateMany({ where: { id, vendorId, revokedAt: null }, data: { revokedAt: new Date() } });
    if (res.count === 0) throw AppError.notFound("Link not found");
    await audit(vendorId, "share.revoke", "share_link", id);
    return { id, revoked: true };
  },

  /** Public, aggregates only: first name, no phone, no area. */
  async publicStatement(token: string, ip: string) {
    await rateLimit(`pubpass:${ip}`, RATE.publicPassport.limit, RATE.publicPassport.windowSec);
    if (token.length < 20 || token.length > 100) throw AppError.notFound();
    const link = await prisma.shareLink.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!link || link.revokedAt || link.expiresAt <= new Date()) throw AppError.notFound();
    const st = await this.statement(link.vendorId);
    return {
      first_name: st.name.trim().split(/\s+/)[0],
      stall_type: st.stall_type,
      period_from: st.period_from,
      period_to: st.period_to,
      avg_daily_profit: st.avg_daily_profit,
      active_days: st.active_days,
      consistency: st.consistency,
      generated_at: st.generated_at,
      generated_by: st.generated_by,
      demo: st.demo,
    };
  },
};
