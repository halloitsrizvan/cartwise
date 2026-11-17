/**
 * Demo seed. SYNTHETIC data only: never present these numbers as measured field results.
 * Run: npm run db:seed   (needs .env.local with Supabase service role key + DB urls)
 */
import { createClient } from "@supabase/supabase-js";
import { PrismaClient, type Prisma } from "@prisma/client";
import { CATALOG } from "../shared/catalog";
import { DEMO_ACCOUNTS, pinToPassword, vendorEmail } from "../server/config/demo";
import { addDays, toDbDate, todayIST } from "../server/lib/dates";
import { planItem, type HistoryDay } from "../server/services/forecast";
import { dayMetrics } from "../server/services/money";
import type { StallType } from "../shared/schemas/domain";

const prisma = new PrismaClient();
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());

async function ensureUser(email: string, password: string, role: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role } });
  if (data?.user) return data.user.id;
  if (!error?.message.toLowerCase().includes("already")) throw error;
  let page = 1;
  for (;;) {
    const { data: list, error: e2 } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (e2) throw e2;
    const u = list.users.find((x) => x.email === email);
    if (u) {
      await admin.auth.admin.updateUserById(u.id, { password, app_metadata: { role }, email_confirm: true });
      return u.id;
    }
    if (list.users.length < 200) throw new Error(`user ${email} not found`);
    page++;
  }
}

type VendorSeed = {
  phone: string;
  name: string;
  stall: StallType;
  area: string;
  days: number;
  gutDays: number;
  baseline: number[]; // per catalog item, units/day
  declared: Record<string, boolean>;
};

const VENDORS: VendorSeed[] = [
  { phone: "9000000001", name: "Suresh Kumar", stall: "fruit", area: "Ernakulam", days: 32, gutDays: 18, baseline: [14, 20, 8, 9, 7, 16], declared: { id_proof: true, vending_proof_or_lor: true, bank_or_upi: true } },
  { phone: "9000000002", name: "Lekha Nair", stall: "tea_snacks", area: "Kochi", days: 28, gutDays: 14, baseline: [110, 45, 60, 50, 40, 0], declared: { id_proof: true, bank_or_upi: true } },
  { phone: "9000000003", name: "Joseph Thomas", stall: "vegetable", area: "Ernakulam", days: 28, gutDays: 14, baseline: [12, 14, 12, 7, 6, 22], declared: { id_proof: true } },
];

const weekdayFactor = [1.25, 0.9, 0.95, 0.95, 1.0, 1.1, 1.3]; // Sun..Sat

async function seedVendor(v: VendorSeed, idx: number) {
  const id = await ensureUser(vendorEmail(v.phone), pinToPassword(DEMO_ACCOUNTS.vendor.secret), "vendor");
  await prisma.profile.deleteMany({ where: { OR: [{ id }, { phone: v.phone }] } });
  const cat = CATALOG[v.stall];
  await prisma.profile.create({
    data: {
      id,
      role: "vendor",
      name: v.name,
      phone: v.phone,
      language: "ml",
      area: v.area,
      vendor: { create: { stallType: v.stall, area: v.area, onboarded: true } },
    },
  });
  const items = await Promise.all(
    cat.map((c, i) =>
      prisma.item.create({
        data: {
          vendorId: id, nameMl: c.name_ml, nameEn: c.name_en, emoji: c.emoji ?? "", unit: c.unit, unitStep: c.unit_step,
          buyPrice: c.buy_price, sellPrice: c.sell_price, categorySlug: c.category_slug, perishable: c.perishable ?? true, sortOrder: i,
          active: v.baseline[i] > 0,
        },
      }),
    ),
  );
  const active = items.filter((i) => i.active);
  const rand = rng(1000 + idx * 77);
  const today = todayIST();
  const start = addDays(today, -v.days);
  const history: Record<string, HistoryDay[]> = {};
  let closedCount = 0;
  const gutWaste: number[] = [];
  const planWaste: number[] = [];

  for (let n = 0; n < v.days; n++) {
    const date = addDays(start, n);
    const wd = new Date(`${date}T00:00:00Z`).getUTCDay();
    const rain = rand() < 0.2;
    const festival = n % 13 === 6;
    const payday = new Date(`${date}T00:00:00Z`).getUTCDate() <= 7;
    const gut = n < v.gutDays;
    const rainMult = rain ? (v.stall === "tea_snacks" ? 1.1 : 0.8) : 1;
    const ctxMult = rainMult * (festival ? 1.3 : 1) * (payday ? 1.1 : 1);
    // slight growth after the vendor starts planning
    const growth = gut ? 1 : 1.03;

    const dayLog = await prisma.dayLog.create({
      data: { vendorId: id, date: toDbDate(date), rain, festival, paydayWeek: payday, status: "closed", closedAt: new Date(`${date}T13:30:00Z`) },
    });

    const lines = active.map((it, i) => {
      const idxInCat = items.indexOf(it);
      const mean = v.baseline[idxInCat] * weekdayFactor[wd] * ctxMult * growth;
      const demand = Math.max(0, mean * (1 + 0.11 * gauss(rand)));
      const step = it.unitStep;
      const dem = Math.round(demand / step) * step;
      let bought: number;
      let recommended: number | null = null;
      if (gut) {
        // gut feel: noisy, biased high, sometimes far too low
        bought = Math.max(step, Math.round((mean * (0.6 + rand() * 1.15)) / step) * step);
      } else {
        const p = planItem({
          item: { id: it.id, buyPrice: it.buyPrice, sellPrice: it.sellPrice, unitStep: step, categorySlug: it.categorySlug },
          stall: v.stall, history: history[it.id] ?? [], closedDays: closedCount, targetDate: date,
          ctx: { rain, festival, paydayWeek: payday },
        });
        recommended = p.recommended;
        bought = p.recommended;
      }
      const sold = Math.min(dem, bought);
      const soldOut = dem >= bought;
      return { it, i, bought, sold, leftover: Math.max(0, bought - sold), soldOut, dem, recommended };
    });

    // sale events: split each item's sold qty into a handful of timestamped events
    const events: Prisma.SaleEventCreateManyInput[] = [];
    for (const l of lines) {
      if (l.sold <= 0) continue;
      const parts = Math.min(10, Math.max(2, Math.round(l.sold / l.it.unitStep / 3)));
      let left = l.sold;
      for (let p = 0; p < parts; p++) {
        const q = p === parts - 1 ? left : Math.max(l.it.unitStep, Math.round((l.sold / parts / l.it.unitStep) * (0.6 + rand() * 0.8)) * l.it.unitStep);
        const qty = Math.min(q, left);
        if (qty <= 0) continue;
        left = Math.round((left - qty) * 1000) / 1000;
        const hour = 7 + Math.floor(rand() * 12);
        events.push({ dayLogId: dayLog.id, itemId: l.it.id, qty, ts: new Date(`${date}T${String(hour - 5).padStart(2, "0")}:${String(Math.floor(rand() * 60)).padStart(2, "0")}:00Z`), clientId: `seed-${id}-${date}-${l.i}-${p}` });
      }
    }
    await prisma.saleEvent.createMany({ data: events });
    await prisma.dayItemSummary.createMany({
      data: lines.map((l) => ({ dayLogId: dayLog.id, itemId: l.it.id, boughtQty: l.bought, soldQty: l.sold, leftoverQty: l.leftover, soldOut: l.soldOut, soldOutAt: l.soldOut ? `${14 + Math.floor(rand() * 4)}:${rand() < 0.5 ? "00" : "30"}` : null })),
    });
    const purchase = lines.reduce((s, l) => s + l.bought * l.it.buyPrice, 0);
    await prisma.dayLog.update({ where: { id: dayLog.id }, data: { purchaseCost: Math.round(purchase) } });

    const m = dayMetrics(lines.map((l) => ({ boughtQty: l.bought, soldQty: l.sold, leftoverQty: l.leftover, soldOut: l.soldOut, buyPrice: l.it.buyPrice, sellPrice: l.it.sellPrice })), Math.round(purchase));
    (gut ? gutWaste : planWaste).push(m.wastePct);

    if (!gut) {
      const plan = await prisma.plan.create({
        data: {
          vendorId: id, forDate: toDbDate(date), generatedAt: new Date(`${addDays(date, -1)}T14:00:00Z`),
          lines: lines.map((l) => ({ item_id: l.it.id, recommended: l.recommended, low: l.recommended, high: l.recommended, expected_sales: l.sold, expected_profit: 0, reason_codes: [], confidence: "high" })) as unknown as Prisma.InputJsonValue,
          totalExpectedProfit: Math.round(lines.reduce((s, l) => s + l.sold * (l.it.sellPrice - l.it.buyPrice), 0)),
        },
      });
      await prisma.planActual.createMany({ data: lines.map((l) => ({ planId: plan.id, itemId: l.it.id, boughtQty: l.bought, followed: true })) });
    }
    for (const l of lines) (history[l.it.id] ??= []).push({ date, sold: l.sold, soldOut: l.soldOut });
    closedCount++;
  }
  await prisma.dayLog.create({ data: { vendorId: id, date: toDbDate(today), status: "open" } });
  await prisma.registration.create({ data: { vendorId: id, scheme: "pm_svanidhi", status: idx === 0 ? "submitted" : "draft", selfDeclared: v.declared } });
  const avg = (xs: number[]) => (xs.reduce((s, x) => s + x, 0) / (xs.length || 1)) * 100;
  console.log(`${v.name}: ${v.days} days | waste gut ${avg(gutWaste).toFixed(1)}% -> plan ${avg(planWaste).toFixed(1)}%`);
  return id;
}

async function main() {
  console.log("Seeding SYNTHETIC demo data...");
  for (let i = 0; i < VENDORS.length; i++) await seedVendor(VENDORS[i], i);

  // officer
  const officerId = await ensureUser(DEMO_ACCOUNTS.officer.identifier, DEMO_ACCOUNTS.officer.secret, "officer");
  await prisma.profile.deleteMany({ where: { id: officerId } });
  await prisma.profile.create({ data: { id: officerId, role: "officer", name: "Demo Officer", email: DEMO_ACCOUNTS.officer.identifier, language: "en", area: "Ernakulam" } });

  // markets
  const m1 = await ensureUser(DEMO_ACCOUNTS.market.identifier, DEMO_ACCOUNTS.market.secret, "market");
  const m2 = await ensureUser("pending.market@demo.cartwise.app", "Demo-Market-2026", "market");
  await prisma.profile.deleteMany({ where: { id: { in: [m1, m2] } } });
  await prisma.profile.create({ data: { id: m1, role: "market", name: "Anil Wholesale", email: DEMO_ACCOUNTS.market.identifier, phone: "9000000011", area: "Ernakulam", market: { create: { marketName: "Ernakulam Wholesale Market", area: "Ernakulam", approved: true, approvedBy: officerId, approvedAt: new Date() } } } });
  await prisma.profile.create({ data: { id: m2, role: "market", name: "Biju Traders", email: "pending.market@demo.cartwise.app", phone: "9000000012", area: "Kochi", market: { create: { marketName: "Kochi Fresh Hub", area: "Kochi", approved: false } } } });

  // notices
  await prisma.notice.deleteMany({});
  const notices = [
    ["PM SVANidhi: ഈടില്ലാത്ത വായ്പ", "PM SVANidhi: collateral-free loan", "തെരുവ് കച്ചവടക്കാർക്ക് ഈടില്ലാതെ ₹15,000 വരെ പ്രവർത്തന മൂലധന വായ്പ ലഭിക്കും. കൃത്യമായി തിരിച്ചടച്ചാൽ അടുത്ത തവണ കൂടുതൽ തുക.", "Street vendors can get a working-capital loan of up to Rs 15,000 without collateral. Repay on time to qualify for a higher amount next time.", "pm_svanidhi", null],
    ["വെൻഡിങ് സർട്ടിഫിക്കറ്റ് ക്യാമ്പ്", "Vending certificate camp", "ഈ ശനിയാഴ്ച വാർഡ് ഓഫീസിൽ വെൻഡിങ് സർട്ടിഫിക്കറ്റ്/LoR ക്യാമ്പ്. ആധാർ കൊണ്ടുവരിക.", "Vending certificate / LoR camp at the ward office this Saturday. Bring your Aadhaar.", "vending_cert", "Ernakulam"],
    ["ഡിജിറ്റൽ പേയ്‌മെന്റ് ക്യാഷ്ബാക്ക്", "Digital payment cashback", "UPI വഴി പണം സ്വീകരിക്കുന്ന വെൻഡർമാർക്ക് മാസം ₹100 വരെ ക്യാഷ്ബാക്ക്.", "Vendors accepting UPI get up to Rs 100 cashback a month.", "digital_pay", null],
    ["ആരോഗ്യ പരിശോധന ക്യാമ്പ്", "Health check-up camp", "ഭക്ഷണം വിൽക്കുന്നവർക്ക് സൗജന്യ FSSAI രജിസ്ട്രേഷനും ആരോഗ്യ പരിശോധനയും.", "Free FSSAI registration and health check for food vendors.", "fssai", "Kochi"],
    ["മഴക്കാല മുന്നറിയിപ്പ്", "Monsoon advisory", "അടുത്ത ആഴ്ച കനത്ത മഴയ്ക്ക് സാധ്യത. പഴങ്ങളും പച്ചക്കറികളും കുറച്ച് വാങ്ങുക, ചായക്കടകൾ തയ്യാറാകുക.", "Heavy rain likely next week. Buy fewer fruits and vegetables; tea stalls, be ready.", "advisory", null],
  ] as const;
  for (const [i, n] of notices.entries()) {
    await prisma.notice.create({ data: { officerId, titleMl: n[0], titleEn: n[1], bodyMl: n[2], bodyEn: n[3], schemeTag: n[4], areaFilter: n[5], publishedAt: new Date(Date.now() - i * 86_400_000) } });
  }

  // offers (approved market only), matching seeded items
  const from = new Date(Date.now() - 86_400_000);
  const to = new Date(Date.now() + 30 * 86_400_000);
  const offers = [
    ["mango", "മാങ്ങ മൊത്തവില", "Mango wholesale", 48, "kg", 500, "Ernakulam"],
    ["banana", "ഏത്തപ്പഴം മൊത്തവില", "Banana wholesale", 32, "kg", 800, "Ernakulam"],
    ["tomato", "തക്കാളി ഓഫർ", "Tomato offer", 24, "kg", 600, "Ernakulam"],
    ["onion", "സവാള ഓഫർ", "Onion offer", 22, "kg", 1000, "Ernakulam"],
    ["coconut", "തേങ്ങ മൊത്തവില", "Coconut wholesale", 24, "piece", 2000, "Ernakulam"],
    ["tea", "ചായ പൊടി ബൾക്ക് പായ്ക്ക്", "Tea bulk pack (per cup cost)", 3, "cup", 5000, "Kochi"],
  ] as const;
  for (const o of offers) {
    await prisma.offer.create({ data: { marketId: m1, categorySlug: o[0], titleMl: o[1], titleEn: o[2], price: o[3], unit: o[4], qtyAvailable: o[5], validFrom: from, validTo: to, area: o[6] } });
  }
  console.log("Seed done: 3 vendors, 1 officer, 2 markets, 5 notices, 6 offers.");
  console.log(`Demo vendor login: ${DEMO_ACCOUNTS.vendor.identifier} / PIN ${DEMO_ACCOUNTS.vendor.secret}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
