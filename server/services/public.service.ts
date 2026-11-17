import { RATE } from "../config/constants";
import { fromDbDate, todayIST } from "../lib/dates";
import { AppError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { rateLimit } from "../lib/rate-limit";
import { dayRepository } from "../repositories/day.repository";
import { loadDayRecords } from "./money.service";
import { passportStats } from "./passport";
import { reliability } from "./reliability";

type Scored = { score: number; badges: string[]; daysActive: number; consistency: string };
const cache = new Map<string, { at: number; v: Scored }>();
const TTL = 60_000;

async function scoreFor(vendorId: string): Promise<Scored> {
  const hit = cache.get(vendorId);
  if (hit && Date.now() - hit.at < TTL) return hit.v;
  const [records, first] = await Promise.all([loadDayRecords(vendorId), dayRepository.firstLog(vendorId)]);
  const stats = passportStats(records.map((r) => ({ date: r.date, profit: r.profit })), first ? fromDbDate(first.date) : null, todayIST());
  const last30 = records.slice(-30);
  const avgWaste = last30.length ? last30.reduce((s, r) => s + r.wastePct, 0) / last30.length : 0;
  const r = reliability({ loggedDays: stats.loggedDays, closedRatio: stats.closedRatio, consistency: stats.consistency, avgWastePct: avgWaste });
  const v = { ...r, daysActive: stats.loggedDays, consistency: stats.consistency };
  cache.set(vendorId, { at: Date.now(), v });
  return v;
}

const firstName = (n: string) => n.trim().split(/\s+/)[0] || "-";

export const publicService = {
  /** Opt-in vendors only. First name, stall type, area, place, score: no income, no exact contact unless the vendor set a public phone. */
  async list(ip: string, p: { area?: string; stall?: string; q?: string; limit: number }) {
    await rateLimit(`pubvendors:${ip}`, RATE.publicPassport.limit, RATE.publicPassport.windowSec);
    const rows = await prisma.vendor.findMany({
      where: {
        publicListed: true,
        onboarded: true,
        ...(p.stall ? { stallType: p.stall as "fruit" } : {}),
        ...(p.area ? { area: { contains: p.area, mode: "insensitive" } } : {}),
        ...(p.q ? { profile: { name: { contains: p.q, mode: "insensitive" } } } : {}),
      },
      include: { profile: true },
      take: 100,
    });
    const scored = await Promise.all(rows.map(async (v) => ({ v, s: await scoreFor(v.profileId) })));
    return scored
      .sort((a, b) => b.s.score - a.s.score || b.s.daysActive - a.s.daysActive)
      .slice(0, p.limit)
      .map(({ v, s }, i) => ({
        id: v.profileId,
        first_name: firstName(v.profile.name),
        stall_type: v.stallType,
        area: v.area,
        place: v.publicPlace,
        score: s.score,
        badges: s.badges,
        days_active: s.daysActive,
        rank: i + 1,
      }));
  },

  async profile(ip: string, id: string) {
    await rateLimit(`pubvendors:${ip}`, RATE.publicPassport.limit, RATE.publicPassport.windowSec);
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw AppError.notFound();
    const v = await prisma.vendor.findFirst({
      where: { profileId: id, publicListed: true, onboarded: true },
      include: { profile: true, items: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
    });
    if (!v) throw AppError.notFound();
    const s = await scoreFor(id);
    return {
      id,
      first_name: firstName(v.profile.name),
      stall_type: v.stallType,
      area: v.area,
      place: v.publicPlace,
      score: s.score,
      badges: s.badges,
      days_active: s.daysActive,
      consistency: s.consistency,
      phone: v.publicPhone,
      items: v.items.map((i) => ({ name_ml: i.nameMl, name_en: i.nameEn, emoji: i.emoji })),
    };
  },
};
