import { z } from "zod";
import * as S from "@/shared/schemas/domain";
import { HealthSchema } from "@/shared/schemas/health";
import { errorResponses, okResponse, registry } from "./registry";

type Method = "get" | "post" | "patch" | "delete";
type Roles = "public" | "any" | S.Role[];

function reg(method: Method, path: string, tag: string, roles: Roles, summary: string, opts: { body?: z.ZodType; query?: z.ZodObject; res?: z.ZodType; status?: number } = {}) {
  const params = [...path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
  const authed = roles !== "public";
  registry.registerPath({
    method,
    path,
    tags: [tag],
    summary: `${summary}${Array.isArray(roles) ? ` (role: ${roles.join(", ")})` : ""}`,
    security: authed ? [{ supabaseSession: [] }] : [],
    request: {
      ...(params.length ? { params: z.object(Object.fromEntries(params.map((p) => [p, z.string()]))) } : {}),
      ...(opts.query ? { query: opts.query } : {}),
      ...(opts.body ? { body: { content: { "application/json": { schema: opts.body } } } } : {}),
    },
    responses: {
      [opts.status ?? 200]: okResponse("Success: { data }", opts.res ?? z.unknown()),
      ...(opts.body || opts.query ? { 400: errorResponses[400] } : {}),
      ...(authed ? { 401: errorResponses[401], 403: errorResponses[403] } : {}),
      429: errorResponses[429],
    },
  });
}

const V: Roles = ["vendor"];
const O: Roles = ["officer"];
const M: Roles = ["market"];

reg("get", "/api/health", "System", "public", "Health: status, version, DB reachability", { res: HealthSchema });
reg("get", "/api/v1/auth/config", "Auth", "public", "Public config (demo mode flag)");
reg("post", "/api/v1/auth/login", "Auth", "public", "Log in (vendor phone+PIN, officer/market email+password). Rate limited", { body: S.LoginSchema });
reg("post", "/api/v1/auth/register/vendor", "Auth", "public", "Register a vendor (phone + PIN)", { body: S.RegisterVendorSchema, status: 201 });
reg("post", "/api/v1/auth/register/market", "Auth", "public", "Register a market (pending approval)", { body: S.RegisterMarketSchema, status: 201 });
reg("post", "/api/v1/auth/demo", "Auth", "public", "Demo login (only when DEMO_MODE=true)", { body: S.DemoLoginSchema });
reg("post", "/api/v1/auth/logout", "Auth", "public", "Log out");
reg("get", "/api/v1/auth/me", "Auth", "any", "Current account");
reg("post", "/api/v1/auth/pin", "Auth", V, "Change PIN", { body: S.PinChangeSchema });

reg("post", "/api/v1/vendors/onboard", "Vendor", V, "Finish onboarding with stall type, area and items", { body: S.OnboardSchema });
reg("get", "/api/v1/vendors/me", "Vendor", V, "My profile");
reg("patch", "/api/v1/vendors/me", "Vendor", V, "Update my profile", { body: S.VendorPatchSchema });
reg("get", "/api/v1/items", "Items", V, "List items (?all=true includes hidden)", { res: z.array(S.ItemDTOSchema) });
reg("post", "/api/v1/items", "Items", V, "Create item", { body: S.ItemInputSchema, res: S.ItemDTOSchema, status: 201 });
reg("patch", "/api/v1/items/{id}", "Items", V, "Update item", { body: S.ItemPatchSchema, res: S.ItemDTOSchema });
reg("delete", "/api/v1/items/{id}", "Items", V, "Soft-delete item (active=false)");

reg("get", "/api/v1/day/today", "Day", V, "Today's log, items with sold qty, totals");
reg("patch", "/api/v1/day/context", "Day", V, "Set rain / festival / payday (?for=tomorrow regenerates the plan)", { body: S.ContextSchema, query: S.ForQuery });
reg("post", "/api/v1/day/sales", "Day", V, "Batch sale events. IDEMPOTENT on client_id (offline sync endpoint)", { body: S.SalesBatchSchema });
reg("delete", "/api/v1/day/sales/{id}", "Day", V, "Undo (void) a sale; id may be the event id or client_id");
reg("post", "/api/v1/day/close", "Day", V, "Close the day in one transaction (row lock). Same payload twice = 200, different payload = 409", { body: S.CloseDaySchema });

reg("get", "/api/v1/plan/tomorrow", "Plan", V, "Tomorrow's buy plan (generated if missing)");
reg("get", "/api/v1/plan/today", "Plan", V, "Today's plan");
reg("post", "/api/v1/plan/override", "Plan", V, "Override the recommended quantity of one item", { body: S.OverrideSchema });

reg("get", "/api/v1/money/summary", "Money", V, "Profit, waste and missed sales for 7 or 30 days", { query: S.RangeQuery });
reg("get", "/api/v1/money/before-after", "Money", V, "Followed-plan days vs gut-feel days");

reg("get", "/api/v1/passport", "Passport", V, "Income statement data");
reg("get", "/api/v1/passport/readiness", "Passport", V, "Indicative scheme readiness checklist");
reg("patch", "/api/v1/passport/self-declared", "Passport", V, "Tick self-declared checklist items", { body: S.SelfDeclaredSchema });
reg("get", "/api/v1/passport/share", "Passport", V, "List my share links (never the token)");
reg("post", "/api/v1/passport/share", "Passport", V, "Create a share link. URL returned ONCE; only the token hash is stored. Rate limited", { body: S.ShareCreateSchema, status: 201 });
reg("delete", "/api/v1/passport/share/{id}", "Passport", V, "Revoke a share link");
reg("get", "/api/v1/public/passport/{token}", "Public", "public", "Read-only statement by share token (rate limited, noindex, 404 if expired/revoked)");

reg("get", "/api/v1/offers", "Offers", V, "Matched wholesale offers with savings (max 5)");
reg("post", "/api/v1/offers/{id}/seen", "Offers", V, "Mark an offer as seen");
reg("post", "/api/v1/offers/{id}/report", "Offers", V, "Report an offer");
reg("get", "/api/v1/notices", "Notices", V, "Scheme notices");
reg("post", "/api/v1/notices/{id}/read", "Notices", V, "Mark a notice read");

reg("get", "/api/v1/officer/overview", "Officer", O, "KPIs, trend and area breakdown");
reg("get", "/api/v1/officer/notices", "Officer", O, "Notices with read counts");
reg("post", "/api/v1/officer/notices", "Officer", O, "Publish a notice", { body: S.NoticeInputSchema, status: 201 });
reg("patch", "/api/v1/officer/notices/{id}", "Officer", O, "Edit a notice", { body: S.NoticePatchSchema });
reg("get", "/api/v1/officer/vendors", "Officer", O, "Vendors with readiness");
reg("get", "/api/v1/officer/vendors/{id}/application-summary", "Officer", O, "Pre-filled (simulated) application summary");
reg("patch", "/api/v1/officer/registrations/{id}", "Officer", O, "Set registration status", { body: S.RegistrationPatchSchema });
reg("get", "/api/v1/officer/markets", "Officer", O, "Markets and approval state");
reg("patch", "/api/v1/officer/markets/{id}/approve", "Officer", O, "Approve or reject a market", { body: S.MarketApproveSchema });
reg("get", "/api/v1/officer/export.csv", "Officer", O, "Anonymised aggregate CSV (areas with <3 vendors suppressed)");

reg("get", "/api/v1/market/offers", "Market", M, "My offers");
reg("post", "/api/v1/market/offers", "Market", M, "Post an offer. 403 until an officer approves the market", { body: S.OfferInputSchema, status: 201 });
reg("patch", "/api/v1/market/offers/{id}", "Market", M, "Edit / expire / remove an offer", { body: S.OfferPatchSchema });
reg("get", "/api/v1/market/stats", "Market", M, "Offers live, vendors reached, views");
