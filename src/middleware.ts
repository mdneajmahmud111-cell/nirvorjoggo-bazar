import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role;
    if (req.nextUrl.pathname.startsWith("/admin") && role !== "ADMIN" && role !== "STAFF") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        if (!req.nextUrl.pathname.startsWith("/admin")) return true;
        return Boolean(token);
      },
    },
    pages: { signIn: "/login" },
  },
);

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
