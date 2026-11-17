import { ok, route } from "@/server/lib/route";
import { adminService } from "@/server/services/admin.service";

export const GET = route({ auth: ["admin"] }, async () => ok(await adminService.vendors()));
