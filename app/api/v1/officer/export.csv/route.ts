import { route } from "@/server/lib/route";
import { officerService } from "@/server/services/officer.service";

export const GET = route({ auth: ["officer"] }, async ({ user }) => {
  const csv = await officerService.exportCsv(user!.id);
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="cartwise-aggregates.csv"', "Cache-Control": "no-store" },
  });
});
