import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { TransitionReleaseSchema, canTransition } from "@repo/shared";
import type { ReleaseStatus, AiModule } from "@repo/shared";
import { getAiJobsQueue } from "@/lib/queue";

const PIPELINE_MODULES: AiModule[] = ["COVER", "SOCIAL", "TEASER"];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const body: unknown = await req.json();
  const parsed = TransitionReleaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const release = await prisma.release.findFirst({
    where: { id, artist: { userId: user.id }, deletedAt: null },
    include: {
      assets: { where: { kind: "AUDIO_MASTER" } },
      brandProfile: true,
    },
  });
  if (!release) return NextResponse.json({ error: "Release not found" }, { status: 404 });

  const result = canTransition({
    release: {
      status: release.status,
      title: release.title,
      brandProfileStatus: release.brandProfile.status,
      hasAudioMaster: release.assets.length > 0,
      hasCoverAsset: false,
      hasGenre: !!(release.metadata as Record<string, unknown>)["genre"],
    },
    event: parsed.data.event,
    actorRole: "artist",
    ...(parsed.data.reason !== undefined ? { reason: parsed.data.reason } : {}),
  });

  if (!result.allowed) {
    return NextResponse.json({ error: result.reason }, { status: 422 });
  }

  const toStatus = result.toStatus as ReleaseStatus;

  const [updated] = await prisma.$transaction([
    prisma.release.update({ where: { id }, data: { status: toStatus } }),
    prisma.releaseStatusEvent.create({
      data: {
        releaseId: id,
        fromStatus: release.status,
        toStatus,
        event: parsed.data.event,
        actorRole: "artist",
        actorRef: user.email,
        reason: parsed.data.reason ?? null,
      },
    }),
  ]);

  if (result.toStatus === "CONTENT_PENDING") {
    const pipeline = release.pipelineConfig as {
      modules?: { cover?: boolean; social?: boolean; teaser?: boolean };
    };

    const enabledModules = PIPELINE_MODULES.filter((mod) => {
      const key = mod.toLowerCase() as "cover" | "social" | "teaser";
      return pipeline.modules?.[key] !== false;
    });

    const queue = getAiJobsQueue();

    for (const module of enabledModules) {
      const aiJob = await prisma.aiJob.create({
        data: {
          releaseId: id,
          module,
          jobId: `${id}-${module}-${String(Date.now())}`,
          status: "QUEUED",
          input: {
            releaseId: id,
            artistId: release.artistId,
            brandProfileData: release.brandProfile.data,
            release: { title: release.title },
          },
        },
      });

      await queue.add(
        module,
        {
          jobId: aiJob.id,
          module,
          releaseId: id,
          artistId: release.artistId,
          input: aiJob.input,
        },
        {
          jobId: aiJob.id,
          attempts: 3,
          backoff: { type: "custom" },
        },
      );
    }
  }

  return NextResponse.json(updated);
}
