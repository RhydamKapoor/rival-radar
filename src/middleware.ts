import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export default async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const path = req.nextUrl.pathname;

  const isAuthPage = path === "/login" || path === "/register";

  // Allow access to auth pages for unauthenticated users
  if (isAuthPage && !token) return NextResponse.next();

  // Redirect unauthenticated users trying to access protected routes
  if (!token && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  // Redirect authenticated users away from auth pages
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
