import { NextResponse } from "next/server";

// Только для локальной разработки — устанавливает сессию demo-пользователя
export function GET() {
  if (process.env["NODE_ENV"] === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const response = NextResponse.redirect("http://localhost:3000/dashboard");
  response.cookies.set("authjs.session-token", "demo-session-token-local-dev", {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
