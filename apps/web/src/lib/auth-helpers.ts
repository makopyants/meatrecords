import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session, error: null };
}

export async function requireModerator() {
  const { session, error } = await requireSession();
  if (error ?? !session) return { session: null, error: error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!session.user.isModerator) {
    return { session: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session, error: null };
}
