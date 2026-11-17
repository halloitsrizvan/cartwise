import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = { matcher: ["/app/:path*", "/officer/:path*", "/market/:path*", "/p/:path*"] };
