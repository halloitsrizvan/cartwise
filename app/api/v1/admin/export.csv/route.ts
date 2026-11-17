import { route } from "@/server/lib/route";
import { adminService } from "@/server/services/admin.service";

export const GET = route({ auth: ["admin"] }, async ({ user }) => {
  const csv = await adminService.exportCsv(user!.id);
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="cartwise-aggregates.csv"', "Cache-Control": "no-store" },
  });
});
