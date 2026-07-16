import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionId = request.cookies.get("session_id")?.value;
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  if (pathname === "/") {
    return NextResponse.redirect(new URL(sessionId ? "/assignments/dashboard" : "/login", request.url));
  }

  if (!sessionId && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (sessionId && isPublicRoute) {
    return NextResponse.redirect(new URL("/assignments/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
