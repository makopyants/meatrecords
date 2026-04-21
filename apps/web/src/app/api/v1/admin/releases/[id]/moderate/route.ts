import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModerator } from "@/lib/auth-helpers";
import { ModerateReleaseSchema, canTransition } from "@repo/shared";
import type { ReleaseStatus } from "@repo/shared";

const ACTION_EVENT = {
  approve: "approve",
  reject: "reject",
  send_back: "send_back",
} as const;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireModerator();
  if (error) return error;

  const { id } = await params;
  const body: unknown = await req.json();
  const parsed = ModerateReleaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const release = await prisma.release.findFirst({
    where: { id, deletedAt: null },
    include: {
      assets: { where: { kind: "COVER" } },
    },
  });
  if (!release) return NextResponse.json({ error: "Release not found" }, { status: 404 });

  const event = ACTION_EVENT[parsed.data.action];
  const result = canTransition({
    release: {
      status: release.status as ReleaseStatus,
      title: release.title,
      hasAudioMaster: true,
      hasCoverAsset: release.assets.length > 0,
      hasGenre: !!(release.metadata as Record<string, unknown>)["genre"],
    },
    event,
    actorRole: "moderator",
    ...(parsed.data.reason !== undefined ? { reason: parsed.data.reason } : {}),
  });

  if (!result.allowed) {
    return NextResponse.json({ error: result.reason }, { status: 422 });
  }

  await prisma.$transaction([
    prisma.release.update({ where: { id }, data: { status: result.toStatus! } }),
    prisma.moderationRecord.create({
      data: {
        releaseId: id,
        action: parsed.data.action === "approve" ? "APPROVED"
          : parsed.data.action === "reject" ? "REJECTED"
          : "SENT_BACK",
        ...(parsed.data.reason !== undefined ? { reason: parsed.data.reason } : {}),
        moderatorEmail: session.user.email,
      },
    }),
    prisma.releaseStatusEvent.create({
      data: {
        releaseId: id,
        fromStatus: release.status,
        toStatus: result.toStatus!,
        event,
        actorRole: "moderator",
        actorRef: session.user.email,
        reason: parsed.data.reason ?? null,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
