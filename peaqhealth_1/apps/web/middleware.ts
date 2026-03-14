import { NextRequest, NextResponse } from "next/server";
import {
  createMiddlewareClient,
  getPostLoginRedirect,
} from "@/lib/supabase/middleware-utils";

const PUBLIC_ROUTES = ["/", "/login", "/signup"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  const supabase = createMiddlewareClient(request, response);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Unauthenticated user hitting a protected route → /login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated user on /login or /signup → redirect to dashboard or onboarding
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const dest = await getPostLoginRedirect(supabase, user.id);
    const url = request.nextUrl.clone();
    url.pathname = dest;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all routes except:
     *   - _next/static, _next/image (Next.js internals)
     *   - favicon.ico, sitemap.xml, robots.txt
     *   - public folder assets (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
