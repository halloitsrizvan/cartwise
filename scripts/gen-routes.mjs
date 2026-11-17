// One-off generator for thin route handlers. Run: node scripts/gen-routes.mjs
import fs from "node:fs";
import path from "node:path";

const R = (p, body) => {
  const f = path.join("app/api/v1", p, "route.ts");
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, body.trimStart());
};
const hdr = `import { ok, route } from "@/server/lib/route";\n`;
const V = `{ auth: ["vendor"] }`;

R("auth/login", `${hdr}import { LoginSchema } from "@/shared/schemas/domain";
import { RATE } from "@/server/config/constants";
import { authService } from "@/server/services/auth.service";

export const POST = route({ body: LoginSchema, rateLimit: { name: "login", ...RATE.login } }, async ({ body }) =>
  ok(await authService.login(body.identifier, body.secret)),
);
`);
R("auth/register/vendor", `${hdr}import { RegisterVendorSchema } from "@/shared/schemas/domain";
import { RATE } from "@/server/config/constants";
import { authService } from "@/server/services/auth.service";

export const POST = route({ body: RegisterVendorSchema, rateLimit: { name: "register", ...RATE.login } }, async ({ body }) =>
  ok(await authService.registerVendor(body.phone, body.pin), 201),
);
`);
R("auth/register/market", `${hdr}import { RegisterMarketSchema } from "@/shared/schemas/domain";
import { RATE } from "@/server/config/constants";
import { authService } from "@/server/services/auth.service";

export const POST = route({ body: RegisterMarketSchema, rateLimit: { name: "register", ...RATE.login } }, async ({ body }) =>
  ok(await authService.registerMarket(body), 201),
);
`);
R("auth/demo", `${hdr}import { DemoLoginSchema } from "@/shared/schemas/domain";
import { RATE } from "@/server/config/constants";
import { authService } from "@/server/services/auth.service";

export const POST = route({ body: DemoLoginSchema, rateLimit: { name: "login", ...RATE.login } }, async ({ body }) =>
  ok(await authService.demo(body.role)),
);
`);
R("auth/logout", `${hdr}import { authService } from "@/server/services/auth.service";

export const POST = route({}, async () => ok(await authService.logout()));
`);
R("auth/me", `${hdr}import { prisma } from "@/server/lib/prisma";

export const GET = route({ auth: true }, async ({ user }) => {
  const p = await prisma.profile.findUnique({ where: { id: user!.id }, include: { vendor: true, market: true } });
  return ok({
    id: user!.id,
    role: user!.role,
    name: user!.name,
    language: user!.language,
    onboarded: user!.role === "vendor" ? !!p?.vendor?.onboarded : true,
    approved: user!.role === "market" ? !!p?.market?.approved : undefined,
    demo: process.env.DEMO_MODE === "true",
  });
});
`);
R("auth/pin", `${hdr}import { PinChangeSchema } from "@/shared/schemas/domain";
import { authService } from "@/server/services/auth.service";

export const POST = route({ auth: ["vendor"], body: PinChangeSchema, rateLimit: { name: "pin", limit: 5, windowSec: 60 } }, async ({ user, body }) =>
  ok(await authService.changePin(user!.id, user!.phone ?? "", body.current_pin, body.new_pin)),
);
`);

R("vendors/onboard", `${hdr}import { OnboardSchema } from "@/shared/schemas/domain";
import { vendorService } from "@/server/services/vendor.service";

export const POST = route({ auth: ["vendor"], body: OnboardSchema }, async ({ user, body }) =>
  ok(await vendorService.onboard(user!.id, body)),
);
`);
R("vendors/me", `${hdr}import { VendorPatchSchema } from "@/shared/schemas/domain";
import { vendorService } from "@/server/services/vendor.service";

export const GET = route(${V}, async ({ user }) => ok(await vendorService.me(user!.id)));
export const PATCH = route({ auth: ["vendor"], body: VendorPatchSchema }, async ({ user, body }) =>
  ok(await vendorService.patch(user!.id, body)),
);
`);
R("items", `${hdr}import { z } from "zod";
import { ItemInputSchema } from "@/shared/schemas/domain";
import { vendorService } from "@/server/services/vendor.service";

export const GET = route({ auth: ["vendor"], query: z.object({ all: z.enum(["true", "false"]).optional() }) }, async ({ user, query }) =>
  ok(await vendorService.listItems(user!.id, query.all === "true")),
);
export const POST = route({ auth: ["vendor"], body: ItemInputSchema }, async ({ user, body }) =>
  ok(await vendorService.createItem(user!.id, body), 201),
);
`);
R("items/[id]", `${hdr}import { ItemPatchSchema } from "@/shared/schemas/domain";
import { vendorService } from "@/server/services/vendor.service";

export const PATCH = route({ auth: ["vendor"], body: ItemPatchSchema }, async ({ user, body, params }) =>
  ok(await vendorService.updateItem(user!.id, params.id, body)),
);
export const DELETE = route(${V}, async ({ user, params }) => ok(await vendorService.deleteItem(user!.id, params.id)));
`);

R("day/today", `${hdr}import { dayService } from "@/server/services/day.service";

export const GET = route(${V}, async ({ user }) => ok(await dayService.today(user!.id)));
`);
R("day/context", `${hdr}import { ContextSchema, ForQuery } from "@/shared/schemas/domain";
import { dayService } from "@/server/services/day.service";
import { planService } from "@/server/services/plan.service";

export const PATCH = route({ auth: ["vendor"], body: ContextSchema, query: ForQuery }, async ({ user, body, query }) =>
  query.for === "tomorrow"
    ? ok(await planService.setTomorrowContext(user!.id, { rain: body.rain, festival: body.festival, paydayWeek: body.payday_week }))
    : ok(await dayService.setContext(user!.id, body)),
);
`);
R("day/sales", `${hdr}import { SalesBatchSchema } from "@/shared/schemas/domain";
import { dayService } from "@/server/services/day.service";

export const POST = route({ auth: ["vendor"], body: SalesBatchSchema }, async ({ user, body }) =>
  ok(await dayService.addSales(user!.id, body.events)),
);
`);
R("day/sales/[id]", `${hdr}import { dayService } from "@/server/services/day.service";

export const DELETE = route(${V}, async ({ user, params }) => ok(await dayService.voidSale(user!.id, params.id)));
`);
R("day/close", `${hdr}import { CloseDaySchema } from "@/shared/schemas/domain";
import { dayService } from "@/server/services/day.service";

export const POST = route({ auth: ["vendor"], body: CloseDaySchema }, async ({ user, body }) =>
  ok(await dayService.close(user!.id, body)),
);
`);

R("plan/tomorrow", `${hdr}import { planService } from "@/server/services/plan.service";

export const GET = route(${V}, async ({ user }) => ok(await planService.tomorrow(user!.id)));
`);
R("plan/today", `${hdr}import { planService } from "@/server/services/plan.service";

export const GET = route(${V}, async ({ user }) => ok(await planService.forToday(user!.id)));
`);
R("plan/override", `${hdr}import { OverrideSchema } from "@/shared/schemas/domain";
import { planService } from "@/server/services/plan.service";

export const POST = route({ auth: ["vendor"], body: OverrideSchema }, async ({ user, body }) =>
  ok(await planService.override(user!.id, body)),
);
`);

R("money/summary", `${hdr}import { RangeQuery } from "@/shared/schemas/domain";
import { moneyService } from "@/server/services/money.service";

export const GET = route({ auth: ["vendor"], query: RangeQuery }, async ({ user, query }) =>
  ok(await moneyService.summary(user!.id, query.range === "30" ? 30 : 7)),
);
`);
R("money/before-after", `${hdr}import { moneyService } from "@/server/services/money.service";

export const GET = route(${V}, async ({ user }) => ok(await moneyService.beforeAfter(user!.id)));
`);

R("passport", `${hdr}import { passportService } from "@/server/services/passport.service";

export const GET = route(${V}, async ({ user }) => ok(await passportService.statement(user!.id)));
`);
R("passport/readiness", `${hdr}import { passportService } from "@/server/services/passport.service";

export const GET = route(${V}, async ({ user }) => ok(await passportService.readiness(user!.id)));
`);
R("passport/self-declared", `${hdr}import { SelfDeclaredSchema } from "@/shared/schemas/domain";
import { passportService } from "@/server/services/passport.service";

export const PATCH = route({ auth: ["vendor"], body: SelfDeclaredSchema }, async ({ user, body }) =>
  ok(await passportService.setSelfDeclared(user!.id, body)),
);
`);
R("passport/share", `${hdr}import { ShareCreateSchema } from "@/shared/schemas/domain";
import { passportService } from "@/server/services/passport.service";

export const GET = route(${V}, async ({ user }) => ok(await passportService.listShares(user!.id)));
export const POST = route({ auth: ["vendor"], body: ShareCreateSchema }, async ({ user, body }) =>
  ok(await passportService.createShare(user!.id, body.expires_in_days), 201),
);
`);
R("passport/share/[id]", `${hdr}import { passportService } from "@/server/services/passport.service";

export const DELETE = route(${V}, async ({ user, params }) => ok(await passportService.revokeShare(user!.id, params.id)));
`);

R("offers", `${hdr}import { offerService } from "@/server/services/offer.service";

export const GET = route(${V}, async ({ user }) => ok(await offerService.feed(user!.id)));
`);
R("offers/[id]/seen", `${hdr}import { offerService } from "@/server/services/offer.service";

export const POST = route(${V}, async ({ user, params }) => ok(await offerService.markSeen(user!.id, params.id)));
`);
R("offers/[id]/report", `${hdr}import { offerService } from "@/server/services/offer.service";

export const POST = route({ auth: ["vendor"], rateLimit: { name: "report", limit: 10, windowSec: 60 } }, async ({ params }) =>
  ok(await offerService.report(params.id)),
);
`);
R("notices", `${hdr}import { noticeService } from "@/server/services/notice.service";

export const GET = route(${V}, async ({ user }) => ok(await noticeService.listForVendor(user!.id)));
`);
R("notices/[id]/read", `${hdr}import { noticeService } from "@/server/services/notice.service";

export const POST = route(${V}, async ({ user, params }) => ok(await noticeService.markRead(user!.id, params.id)));
`);

R("public/passport/[token]", `import { NextResponse } from "next/server";
import { clientIp } from "@/server/lib/rate-limit";
import { route } from "@/server/lib/route";
import { passportService } from "@/server/services/passport.service";

export const GET = route({}, async ({ req, params }) => {
  const data = await passportService.publicStatement(params.token, clientIp(req));
  return NextResponse.json({ data }, { headers: { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" } });
});
`);

const O = `{ auth: ["officer"] }`;
R("officer/overview", `${hdr}import { officerService } from "@/server/services/officer.service";

export const GET = route(${O}, async () => ok(await officerService.overview()));
`);
R("officer/notices", `${hdr}import { NoticeInputSchema } from "@/shared/schemas/domain";
import { noticeService } from "@/server/services/notice.service";

export const GET = route(${O}, async () => ok(await noticeService.listForOfficer()));
export const POST = route({ auth: ["officer"], body: NoticeInputSchema }, async ({ user, body }) =>
  ok(await noticeService.create(user!.id, body), 201),
);
`);
R("officer/notices/[id]", `${hdr}import { NoticePatchSchema } from "@/shared/schemas/domain";
import { noticeService } from "@/server/services/notice.service";

export const PATCH = route({ auth: ["officer"], body: NoticePatchSchema }, async ({ user, body, params }) =>
  ok(await noticeService.patch(user!.id, params.id, body)),
);
`);
R("officer/vendors", `${hdr}import { officerService } from "@/server/services/officer.service";

export const GET = route(${O}, async () => ok(await officerService.vendors()));
`);
R("officer/vendors/[id]/application-summary", `${hdr}import { officerService } from "@/server/services/officer.service";

export const GET = route(${O}, async ({ params }) => ok(await officerService.applicationSummary(params.id)));
`);
R("officer/registrations/[id]", `${hdr}import { RegistrationPatchSchema } from "@/shared/schemas/domain";
import { officerService } from "@/server/services/officer.service";

export const PATCH = route({ auth: ["officer"], body: RegistrationPatchSchema }, async ({ user, body, params }) =>
  ok(await officerService.setRegistrationStatus(user!.id, params.id, body.status)),
);
`);
R("officer/markets", `${hdr}import { offerService } from "@/server/services/offer.service";

export const GET = route(${O}, async () => ok(await offerService.marketsForOfficer()));
`);
R("officer/markets/[id]/approve", `${hdr}import { MarketApproveSchema } from "@/shared/schemas/domain";
import { offerService } from "@/server/services/offer.service";

export const PATCH = route({ auth: ["officer"], body: MarketApproveSchema }, async ({ user, body, params }) =>
  ok(await offerService.approveMarket(user!.id, params.id, body.approved)),
);
`);
R("officer/export.csv", `import { route } from "@/server/lib/route";
import { officerService } from "@/server/services/officer.service";

export const GET = route({ auth: ["officer"] }, async ({ user }) => {
  const csv = await officerService.exportCsv(user!.id);
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="cartwise-aggregates.csv"', "Cache-Control": "no-store" },
  });
});
`);

const M = `{ auth: ["market"] }`;
R("market/offers", `${hdr}import { OfferInputSchema } from "@/shared/schemas/domain";
import { offerService } from "@/server/services/offer.service";

export const GET = route(${M}, async ({ user }) => ok(await offerService.listMine(user!.id)));
export const POST = route({ auth: ["market"], body: OfferInputSchema }, async ({ user, body }) =>
  ok(await offerService.create(user!.id, body), 201),
);
`);
R("market/offers/[id]", `${hdr}import { OfferPatchSchema } from "@/shared/schemas/domain";
import { offerService } from "@/server/services/offer.service";

export const PATCH = route({ auth: ["market"], body: OfferPatchSchema }, async ({ user, body, params }) =>
  ok(await offerService.patch(user!.id, params.id, body)),
);
`);
R("market/stats", `${hdr}import { offerService } from "@/server/services/offer.service";

export const GET = route(${M}, async ({ user }) => ok(await offerService.stats(user!.id)));
`);
console.log("routes generated");
