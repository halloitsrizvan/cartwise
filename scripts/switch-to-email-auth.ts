/**
 * One-off: move the already-seeded demo accounts to email + password auth.
 * vendors: <phone>@vendor.local -> <name>@demo.cartwise.app ; officer -> admin ; market users deleted.
 * Run: npx tsx --env-file=.env.local scripts/switch-to-email-auth.ts
 */
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { DEMO_ACCOUNTS } from "../server/config/demo";

const prisma = new PrismaClient();
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

async function allUsers() {
  const out = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    out.push(...data.users);
    if (data.users.length < 200) return out;
  }
}

(async () => {
  const users = await allUsers();
  const find = (email: string) => users.find((u) => u.email === email);
  const vendors = [
    ["9000000001", DEMO_ACCOUNTS.vendor.identifier],
    ["9000000002", "lekha@demo.cartwise.app"],
    ["9000000003", "joseph@demo.cartwise.app"],
  ];
  for (const [phone, email] of vendors) {
    const u = find(`${phone}@vendor.local`);
    if (!u) { console.log("skip (not found)", phone); continue; }
    const { error } = await admin.auth.admin.updateUserById(u.id, { email, password: DEMO_ACCOUNTS.vendor.secret, email_confirm: true, app_metadata: { role: "vendor" } });
    if (error) throw error;
    await prisma.profile.updateMany({ where: { id: u.id }, data: { email } });
    console.log("vendor ->", email);
  }
  const officer = find("officer@demo.cartwise.app");
  if (officer) {
    const { error } = await admin.auth.admin.updateUserById(officer.id, { email: DEMO_ACCOUNTS.admin.identifier, password: DEMO_ACCOUNTS.admin.secret, email_confirm: true, app_metadata: { role: "admin" } });
    if (error) throw error;
    await prisma.profile.updateMany({ where: { id: officer.id }, data: { email: DEMO_ACCOUNTS.admin.identifier, role: "admin" } });
    console.log("officer -> admin");
  }
  for (const email of ["market@demo.cartwise.app", "pending.market@demo.cartwise.app"]) {
    const u = find(email);
    if (u) { await admin.auth.admin.deleteUser(u.id); console.log("deleted", email); }
  }
  // listing for demo vendors
  const places: Record<string, string> = { "9000000001": "Near Marine Drive bus stop", "9000000002": "Fort Kochi beach road", "9000000003": "Ernakulam North market gate" };
  for (const [phone, place] of Object.entries(places)) {
    await prisma.vendor.updateMany({ where: { profile: { phone } }, data: { publicListed: true, publicPhone: phone, publicPlace: place } });
  }
  console.log("done");
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
