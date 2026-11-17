// Session refresh + optimistic route protection for proxy.ts. Real authorization lives in
// server guards (requireRole); this only redirects early and adds noindex on private areas.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/app", "/officer", "/market"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return new NextResponse("Server is not configured", { status: 500 });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if (!data.user && PROTECTED.some((p) => path === p || path.startsWith(p + "/"))) {
    const to = request.nextUrl.clone();
    to.pathname = "/login";
    to.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(to);
  }
  response.headers.set("X-Robots-Tag", PROTECTED.some((p) => path.startsWith(p)) || path.startsWith("/p/") ? "noindex, nofollow" : "all");
  return response;
}
