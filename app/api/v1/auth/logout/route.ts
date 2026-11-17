import { ok, route } from "@/server/lib/route";
import { authService } from "@/server/services/auth.service";

export const POST = route({}, async () => ok(await authService.logout()));
