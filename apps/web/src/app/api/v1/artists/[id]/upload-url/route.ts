import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { getPresignedUploadUrl } from "@/lib/storage";
import { z } from "zod";

const Schema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const body: unknown = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const artist = await prisma.artist.findFirst({ where: { id, userId: user.id, deletedAt: null } });
  if (!artist) return NextResponse.json({ error: "Artist not found" }, { status: 404 });

  const key = `artists/${id}/photo/${parsed.data.filename}`;
  const uploadUrl = await getPresignedUploadUrl(key, parsed.data.mimeType);

  if (!uploadUrl) {
    // Dev mode — store a placeholder and update artist directly
    const photoUrl = `/dev-placeholder/${key}`;
    await prisma.artist.update({ where: { id }, data: { photoUrl } });
    return NextResponse.json({ devMode: true, photoUrl });
  }

  const publicUrl = `${process.env["R2_PUBLIC_URL"] ?? ""}/${key}`;
  return NextResponse.json({ uploadUrl, key, photoUrl: publicUrl });
}
