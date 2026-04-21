import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { z } from "zod";

const Schema = z.object({
  status: z.enum(["READY", "APPROVED", "REJECTED"]),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const body: unknown = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const content = await prisma.generatedContent.findFirst({
    where: { id, release: { artist: { userId: user.id } } },
  });
  if (!content) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.generatedContent.update({
    where: { id },
    data: {
      status: parsed.data.status,
      approvedAt: parsed.data.status === "APPROVED" ? new Date() : null,
    },
  });

  return NextResponse.json(updated);
}
