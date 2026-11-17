import { ok, route } from "@/server/lib/route";
import { officerService } from "@/server/services/officer.service";

export const GET = route({ auth: ["officer"] }, async ({ params }) => ok(await officerService.applicationSummary(params.id)));
