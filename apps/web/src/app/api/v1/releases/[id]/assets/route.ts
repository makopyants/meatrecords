import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { z } from "zod";

const Schema = z.object({
  key: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  kind: z.enum(["AUDIO_MASTER", "COVER", "LYRICS", "OTHER"]),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const release = await prisma.release.findFirst({
    where: { id, artist: { userId: user.id }, deletedAt: null },
  });
  if (!release) return NextResponse.json({ error: "Release not found" }, { status: 404 });

  const publicUrl = process.env["R2_PUBLIC_URL"]
    ? `${process.env["R2_PUBLIC_URL"]}/${parsed.data.key}`
    : `/dev-placeholder/${parsed.data.key}`;

  const asset = await prisma.asset.create({
    data: {
      releaseId: id,
      kind: parsed.data.kind,
      source: "USER_UPLOAD",
      url: publicUrl,
      fileName: parsed.data.filename,
      mimeType: parsed.data.mimeType,
      sizeBytes: parsed.data.sizeBytes,
    },
  });

  return NextResponse.json(asset, { status: 201 });
}
