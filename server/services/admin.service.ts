import { audit } from "../lib/audit";
import { addDays, fromDbDate, todayIST } from "../lib/dates";
import { AppError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { dayRepository } from "../repositories/day.repository";
import { loadDayRecords, type DayRecord } from "./money.service";
import { beforeAfter } from "./money";
import { passportStats, readiness, type SelfDeclared } from "./passport";

const avg = (xs: number[]) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0);

async function vendorFacts() {
  const vendors = await prisma.vendor.findMany({ include: { profile: true, registrations: true } });
  const today = todayIST();
  return Promise.all(
    vendors
      .filter((v) => v.onboarded)
      .map(async (v) => {
        const records = await loadDayRecords(v.profileId);
        const first = await dayRepository.firstLog(v.profileId);
        const stats = passportStats(
          records.map((r) => ({ date: r.date, profit: r.profit })),
          first ? fromDbDate(first.date) : null,
          today,
        );
        const reg = v.registrations.find((r) => r.scheme === "pm_svanidhi");
        const ready = readiness(stats, (reg?.selfDeclared ?? {}) as SelfDeclared);
        return { v, records, stats, reg, ready, ba: beforeAfter(records) };
      }),
  );
}

export const adminService = {
  async overview() {
    const facts = await vendorFacts();
    const today = todayIST();
    const weekAgo = addDays(today, -7);
    const active = facts.filter((f) => f.records.some((r) => r.date >= weekAgo)).length;
    const reductions = facts.filter((f) => f.ba.mode !== "none").map((f) => (f.ba.before.avgWastePct - f.ba.after.avgWastePct) * 100);

    const byDate = new Map<string, DayRecord[]>();
    for (const f of facts) for (const r of f.records) if (r.date >= addDays(today, -27)) (byDate.get(r.date) ?? byDate.set(r.date, []).get(r.date)!).push(r);
    const trend = [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, rs]) => ({ date, avg_waste_pct: Math.round(avg(rs.map((r) => r.wastePct)) * 1000) / 10, avg_profit: Math.round(avg(rs.map((r) => r.profit))) }));

    const areas = new Map<string, typeof facts>();
    for (const f of facts) (areas.get(f.v.area || "-") ?? areas.set(f.v.area || "-", []).get(f.v.area || "-")!).push(f);
    const area_breakdown = [...areas.entries()].map(([area, fs]) => ({
      area,
      vendors: fs.length,
      avg_daily_profit: Math.round(avg(fs.map((f) => f.stats.avgDailyProfit))),
      avg_waste_pct: Math.round(avg(fs.flatMap((f) => f.records.map((r) => r.wastePct))) * 1000) / 10,
    }));

    return {
      kpis: {
        active_vendors: active,
        total_vendors: facts.length,
        avg_waste_reduction_pts: Math.round(avg(reductions) * 10) / 10,
        avg_daily_income: Math.round(avg(facts.map((f) => f.stats.avgDailyProfit))),
        ready_vendors: facts.filter((f) => f.ready.ready).length,
      },
      trend,
      area_breakdown,
      demo: process.env.DEMO_MODE === "true",
    };
  },

  async vendors() {
    const facts = await vendorFacts();
    return facts.map((f) => ({
      id: f.v.profileId,
      name: f.v.profile.name,
      area: f.v.area,
      stall_type: f.v.stallType,
      readiness_percent: f.ready.percent,
      logged_days: f.stats.loggedDays,
      avg_daily_profit: f.stats.avgDailyProfit,
      registration_status: f.reg?.status ?? "draft",
    }));
  },

  async applicationSummary(vendorId: string) {
    const v = await prisma.vendor.findUnique({ where: { profileId: vendorId }, include: { profile: true } });
    if (!v) throw AppError.notFound("Vendor not found");
    const reg = await prisma.registration.upsert({
      where: { vendorId_scheme: { vendorId, scheme: "pm_svanidhi" } },
      create: { vendorId, scheme: "pm_svanidhi" },
      update: {},
    });
    const records = await loadDayRecords(vendorId);
    const first = await dayRepository.firstLog(vendorId);
    const stats = passportStats(records.map((r) => ({ date: r.date, profit: r.profit })), first ? fromDbDate(first.date) : null, todayIST());
    const ready = readiness(stats, reg.selfDeclared as SelfDeclared);
    return {
      simulated: true,
      registration_id: reg.id,
      scheme: reg.scheme,
      status: reg.status,
      applicant: { name: v.profile.name, phone: v.profile.phone, area: v.area, stall_type: v.stallType, language: v.profile.language },
      income: {
        avg_daily_profit: stats.avgDailyProfit,
        active_days: stats.activeDays,
        logged_days: stats.loggedDays,
        closed_ratio: stats.closedRatio,
        consistency: stats.consistency,
      },
      readiness: ready,
      self_declared: reg.selfDeclared,
      updated_at: reg.updatedAt.toISOString(),
    };
  },

  async setRegistrationStatus(officerId: string, registrationId: string, status: "draft" | "submitted" | "approved" | "rejected") {
    const res = await prisma.registration.updateMany({ where: { id: registrationId }, data: { status, updatedBy: officerId } });
    if (res.count === 0) throw AppError.notFound("Registration not found");
    await audit(officerId, "registration.status", "registration", registrationId, { status });
    return { id: registrationId, status };
  },

  /** Anonymised aggregates only: per-week overall, per-area rows suppressed below 3 vendors. */
  async exportCsv(officerId: string) {
    const facts = await vendorFacts();
    const week = (d: string) => {
      const t = new Date(`${d}T00:00:00Z`);
      t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7));
      return t.toISOString().slice(0, 10);
    };
    type Row = { vendors: Set<string>; profit: number[]; waste: number[]; days: number };
    const rows = new Map<string, Row>();
    const add = (key: string, vid: string, r: DayRecord) => {
      const row = rows.get(key) ?? rows.set(key, { vendors: new Set(), profit: [], waste: [], days: 0 }).get(key)!;
      row.vendors.add(vid);
      row.profit.push(r.profit);
      row.waste.push(r.wastePct);
      row.days++;
    };
    for (const f of facts) {
      for (const r of f.records) {
        add(`${week(r.date)}|ALL`, f.v.profileId, r);
        add(`${week(r.date)}|${f.v.area}`, f.v.profileId, r);
      }
    }
    const lines = ["week_start,area,vendors,closed_days,avg_daily_profit_rs,avg_waste_pct"];
    for (const [key, row] of [...rows.entries()].sort()) {
      const [wk, area] = key.split("|");
      if (area !== "ALL" && row.vendors.size < 3) {
        lines.push(`${wk},"${area.replace(/"/g, "")}",suppressed,suppressed,suppressed,suppressed`);
      } else {
        lines.push(`${wk},${area === "ALL" ? "ALL" : `"${area.replace(/"/g, "")}"`},${row.vendors.size},${row.days},${Math.round(avg(row.profit))},${(avg(row.waste) * 100).toFixed(1)}`);
      }
    }
    await audit(officerId, "export.csv", "export", "aggregates");
    return lines.join("\n") + "\n";
  },
};
