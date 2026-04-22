import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { z } from "zod";

const Schema = z.object({
  module: z.enum(["COVER", "TEASER"]),
  url: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});

function buildPayload(module: "COVER" | "TEASER", url: string, fileName: string) {
  if (module === "COVER") {
    return { covers: [{ url, prompt: "User upload", variation: fileName }] };
  }
  return { videoUrl: url, thumbnailUrl: url, durationSec: 0 };
}

const KIND_MAP = { COVER: "COVER", TEASER: "TEASER_VIDEO" } as const;

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

  const { module, url, fileName, mimeType, sizeBytes } = parsed.data;

  await prisma.$transaction(async (tx) => {
    // Archive old content for this module
    await tx.generatedContent.updateMany({
      where: { releaseId: id, module, status: { in: ["READY", "APPROVED"] } },
      data: { status: "REJECTED" },
    });

    // Create Asset
    const asset = await tx.asset.create({
      data: {
        releaseId: id,
        kind: KIND_MAP[module],
        source: "USER_UPLOAD",
        url,
        fileName,
        mimeType,
        sizeBytes,
      },
    });

    // Create GeneratedContent pre-approved
    await tx.generatedContent.create({
      data: {
        releaseId: id,
        module,
        status: "APPROVED",
        approvedAt: new Date(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        payload: buildPayload(module, url, fileName) as any,
        assets: { connect: { id: asset.id } },
      },
    });
  });

  return NextResponse.json({ ok: true });
}
