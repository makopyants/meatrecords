import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { z } from "zod";

const PatchSchema = z.object({
  lyrics: z.string().max(10000).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const body: unknown = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const release = await prisma.release.findFirst({
    where: { id, artist: { userId: user.id }, deletedAt: null, status: "DRAFT" },
  });
  if (!release) return NextResponse.json({ error: "Release not found or not editable" }, { status: 404 });

  const currentMeta = (release.metadata ?? {}) as Record<string, unknown>;
  const updatedMeta = { ...currentMeta };
  if (parsed.data.lyrics !== undefined) updatedMeta["lyrics"] = parsed.data.lyrics;

  const updated = await prisma.release.update({
    where: { id },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { metadata: updatedMeta as any },
  });

  return NextResponse.json(updated);
}
