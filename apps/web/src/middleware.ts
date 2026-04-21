import { auth } from "@/auth";
import { NextResponse } from "next/server";

const MODERATOR_EMAILS = (process.env["MODERATOR_EMAILS"] ?? "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session?.user;

  const isArtistRoute = nextUrl.pathname.startsWith("/dashboard") ||
    nextUrl.pathname.startsWith("/releases") ||
    nextUrl.pathname.startsWith("/artists");

  const isAdminRoute = nextUrl.pathname.startsWith("/admin");

  if (isArtistRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (isAdminRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
    const isModerator = MODERATOR_EMAILS.includes(session.user.email ?? "");
    if (!isModerator) {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/releases/:path*", "/artists/:path*", "/admin/:path*"],
};
