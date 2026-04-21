import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { getPresignedUploadUrl, buildAssetKey } from "@/lib/storage";
import { z } from "zod";

const Schema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  kind: z.enum(["AUDIO_MASTER", "COVER", "LYRICS", "OTHER"]),
  sizeBytes: z.number().int().positive(),
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

  const user = await prisma.user.findUnique({ where: { email: session!.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const release = await prisma.release.findFirst({
    where: { id, artist: { userId: user.id }, deletedAt: null },
    include: { artist: { select: { id: true } } },
  });
  if (!release) return NextResponse.json({ error: "Release not found" }, { status: 404 });

  const key = buildAssetKey(
    `releases/${id}/${parsed.data.kind.toLowerCase()}`,
    parsed.data.filename,
  );

  const uploadUrl = await getPresignedUploadUrl(key, parsed.data.mimeType);

  // R2 не настроен — dev mode
  if (!uploadUrl) {
    const asset = await prisma.asset.create({
      data: {
        releaseId: id,
        kind: parsed.data.kind,
        source: "USER_UPLOAD",
        url: `/dev-placeholder/${key}`,
        fileName: parsed.data.filename,
        mimeType: parsed.data.mimeType,
        sizeBytes: parsed.data.sizeBytes,
      },
    });
    return NextResponse.json({ devMode: true, asset }, { status: 201 });
  }

  return NextResponse.json({ uploadUrl, key });
}
