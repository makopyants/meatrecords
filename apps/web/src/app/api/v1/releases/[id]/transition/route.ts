import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { TransitionReleaseSchema, canTransition } from "@repo/shared";
import type { ReleaseStatus } from "@repo/shared";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const body: unknown = await req.json();
  const parsed = TransitionReleaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: session!.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const release = await prisma.release.findFirst({
    where: { id, artist: { userId: user.id }, deletedAt: null },
    include: {
      assets: { where: { kind: "AUDIO_MASTER" } },
      brandProfile: { select: { status: true } },
    },
  });
  if (!release) return NextResponse.json({ error: "Release not found" }, { status: 404 });

  const result = canTransition({
    release: {
      status: release.status as ReleaseStatus,
      title: release.title,
      brandProfileStatus: release.brandProfile.status as "DRAFT" | "LOCKED",
      hasAudioMaster: release.assets.length > 0,
      hasCoverAsset: false,
      hasGenre: !!(release.metadata as Record<string, unknown>)["genre"],
    },
    event: parsed.data.event,
    actorRole: "artist",
    reason: parsed.data.reason,
  });

  if (!result.allowed) {
    return NextResponse.json({ error: result.reason }, { status: 422 });
  }

  const [updated] = await prisma.$transaction([
    prisma.release.update({
      where: { id },
      data: { status: result.toStatus },
    }),
    prisma.releaseStatusEvent.create({
      data: {
        releaseId: id,
        fromStatus: release.status,
        toStatus: result.toStatus!,
        event: parsed.data.event,
        actorRole: "artist",
        actorRef: user.email,
        reason: parsed.data.reason,
      },
    }),
  ]);

  return NextResponse.json(updated);
}
