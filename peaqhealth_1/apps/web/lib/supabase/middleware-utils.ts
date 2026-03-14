import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

/**
 * Create a Supabase client wired to the request/response cookie jar
 * for use inside Next.js middleware.
 */
export function createMiddlewareClient(
  request: NextRequest,
  response: NextResponse
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
}

/**
 * After login, decide where to send the user:
 *   - /onboarding  if onboarding_completed is false
 *   - /dashboard   otherwise
 */
export async function getPostLoginRedirect(
  supabase: ReturnType<typeof createMiddlewareClient>,
  userId: string
): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", userId)
    .single();

  if (data && !data.onboarding_completed) {
    return "/onboarding";
  }
  return "/dashboard";
}
