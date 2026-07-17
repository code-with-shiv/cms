import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// session_id is an httpOnly cookie set by the backend (a different domain),
// so this server-side proxy never receives it and can't gate on it. Real
// auth gating happens client-side in AuthProvider via GET /me instead.
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
