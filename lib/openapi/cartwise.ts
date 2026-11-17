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
const O: Roles = ["admin"];

reg("get", "/api/health", "System", "public", "Health: status, version, DB reachability", { res: HealthSchema });
reg("get", "/api/v1/auth/config", "Auth", "public", "Public config (demo mode flag)");
reg("post", "/api/v1/auth/login", "Auth", "public", "Log in with email + password. Rate limited", { body: S.LoginSchema });
reg("post", "/api/v1/auth/register/vendor", "Auth", "public", "Register a vendor (email + password)", { body: S.RegisterVendorSchema, status: 201 });
reg("post", "/api/v1/auth/demo", "Auth", "public", "Demo login (only when DEMO_MODE=true)", { body: S.DemoLoginSchema });
reg("post", "/api/v1/auth/logout", "Auth", "public", "Log out");
reg("get", "/api/v1/auth/me", "Auth", "any", "Current account");
reg("post", "/api/v1/auth/password", "Auth", V, "Change password", { body: S.PasswordChangeSchema });

reg("post", "/api/v1/vendors/onboard", "Vendor", V, "Finish onboarding with stall type, area and items", { body: S.OnboardSchema });
reg("get", "/api/v1/vendors/me", "Vendor", V, "My profile");
reg("patch", "/api/v1/vendors/me", "Vendor", V, "Update my profile", { body: S.VendorPatchSchema });
reg("get", "/api/v1/items", "Items", V, "List items (?all=true includes hidden)", { res: z.array(S.ItemDTOSchema) });
reg("post", "/api/v1/items", "Items", V, "Create item", { body: S.ItemInputSchema, res: S.ItemDTOSchema, status: 201 });
reg("patch", "/api/v1/items/{id}", "Items", V, "Update item", { body: S.ItemPatchSchema, res: S.ItemDTOSchema });
reg("delete", "/api/v1/items/{id}", "Items", V, "Soft-delete item (active=false)");

reg("get", "/api/v1/day/today", "Day", V, "Today's log, items with sold qty, totals");
reg("patch", "/api/v1/day/context", "Day", V, "Set rain / festival / payday (?for=tomorrow regenerates the plan)", { body: S.ContextSchema, query: S.ForQuery });
reg("post", "/api/v1/voice/transcribe", "Voice", V, "Speech to text (Whisper). multipart/form-data: audio (file, max 2 MB), lang (ml|en). Rate limited");
reg("post", "/api/v1/chat", "Assistant", "public", "Chat assistant (RAG: BM25 over the app guide + the signed-in vendor's own data, Groq LLM). Rate limited", { body: S.ChatSchema });
reg("get", "/api/v1/day/payments", "Day", V, "Payment records: sales grouped into bills with method (cash/UPI) and products", { query: S.PaymentsQuery });
reg("post", "/api/v1/day/sales", "Day", V, "Batch sale events. IDEMPOTENT on client_id (offline sync endpoint)", { body: S.SalesBatchSchema });
reg("delete", "/api/v1/day/sales/{id}", "Day", V, "Undo (void) a sale; id may be the event id or client_id");
reg("post", "/api/v1/day/close", "Day", V, "Close the day in one transaction (row lock). Empty body = numbers derived from the sales (bought = plan qty, leftover = bought - sold). Same payload twice = 200, different payload = 409", { body: S.CloseDayBodySchema });

reg("get", "/api/v1/plan/tomorrow", "Plan", V, "Tomorrow's buy plan (generated if missing)");
reg("get", "/api/v1/plan/today", "Plan", V, "Today's plan");
reg("post", "/api/v1/plan/summary", "Plan", V, "Spoken summary script of the plan page (LLM). The browser reads it aloud. Rate limited", { body: S.PlanSummarySchema });
reg("post", "/api/v1/plan/override", "Plan", V, "Override the recommended quantity of one item", { body: S.OverrideSchema });

reg("get", "/api/v1/money/summary", "Money", V, "Profit, waste and missed sales for 7 or 30 days", { query: S.RangeQuery });
reg("get", "/api/v1/money/before-after", "Money", V, "Followed-plan days vs gut-feel days");

reg("get", "/api/v1/passport", "Passport", V, "Income statement data");
reg("get", "/api/v1/passport/readiness", "Passport", V, "Indicative scheme readiness checklist");
reg("patch", "/api/v1/passport/self-declared", "Passport", V, "Tick self-declared checklist items", { body: S.SelfDeclaredSchema });
reg("get", "/api/v1/passport/share", "Passport", V, "List my share links (never the token)");
reg("post", "/api/v1/passport/share", "Passport", V, "Create a share link. URL returned ONCE; only the token hash is stored. Rate limited", { body: S.ShareCreateSchema, status: 201 });
reg("delete", "/api/v1/passport/share/{id}", "Passport", V, "Revoke a share link");
reg("get", "/api/v1/public/vendors", "Public", "public", "Opt-in vendor directory ranked by reliability score (no income, first name only). Rate limited", { query: S.PublicVendorsQuery });
reg("get", "/api/v1/public/vendors/{id}", "Public", "public", "Public vendor profile (404 unless the vendor opted in)");
reg("get", "/api/v1/public/passport/{token}", "Public", "public", "Read-only statement by share token (rate limited, noindex, 404 if expired/revoked)");

reg("get", "/api/v1/notices", "Notices", V, "Scheme notices");
reg("post", "/api/v1/notices/{id}/read", "Notices", V, "Mark a notice read");

reg("get", "/api/v1/admin/overview", "Admin", O, "KPIs, trend and area breakdown");
reg("get", "/api/v1/admin/notices", "Admin", O, "Notices with read counts");
reg("post", "/api/v1/admin/notices", "Admin", O, "Publish a notice", { body: S.NoticeInputSchema, status: 201 });
reg("patch", "/api/v1/admin/notices/{id}", "Admin", O, "Edit a notice", { body: S.NoticePatchSchema });
reg("get", "/api/v1/admin/vendors", "Admin", O, "Vendors with readiness");
reg("get", "/api/v1/admin/vendors/{id}/application-summary", "Admin", O, "Pre-filled (simulated) application summary");
reg("patch", "/api/v1/admin/registrations/{id}", "Admin", O, "Set registration status", { body: S.RegistrationPatchSchema });
reg("get", "/api/v1/admin/export.csv", "Admin", O, "Anonymised aggregate CSV (areas with <3 vendors suppressed)");

