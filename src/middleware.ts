import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname === "/login" || pathname === "/";
  
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/customers") ||
    pathname.startsWith("/products") ||
    pathname.startsWith("/sales") ||
    pathname.startsWith("/installments") ||
    pathname.startsWith("/financial") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/settings");

  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Se o usuário acessar a raiz "/" sem token, redireciona para "/login"
  if (pathname === "/" && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - img (public images folder like logo)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|img).*)",
  ],
};
