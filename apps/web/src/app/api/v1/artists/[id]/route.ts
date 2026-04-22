import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { z } from "zod";

const PatchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  photoUrl: z.string().url().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const body: unknown = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const artist = await prisma.artist.findFirst({
    where: { id, userId: user.id, deletedAt: null },
  });
  if (!artist) return NextResponse.json({ error: "Artist not found" }, { status: 404 });

  const data: { name?: string; photoUrl?: string | null } = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.photoUrl !== undefined) data.photoUrl = parsed.data.photoUrl;

  const updated = await prisma.artist.update({ where: { id }, data });
  return NextResponse.json(updated);
}
