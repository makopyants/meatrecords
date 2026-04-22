import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { getAiJobsQueue } from "@/lib/queue";
import { z } from "zod";

const Schema = z.object({
  module: z.enum(["COVER", "SOCIAL", "TEASER"]),
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
    include: { brandProfile: true },
  });
  if (!release) return NextResponse.json({ error: "Release not found" }, { status: 404 });

  const { module } = parsed.data;

  // Удалить старый контент и джобы этого модуля
  await prisma.generatedContent.deleteMany({ where: { releaseId: id, module } });
  await prisma.aiJob.updateMany({
    where: { releaseId: id, module, status: { in: ["QUEUED", "FAILED"] } },
    data: { status: "FAILED", error: "Superseded by regeneration request" },
  });

  const jobId = `${id}-${module}-${String(Date.now())}`;
  const aiJob = await prisma.aiJob.create({
    data: {
      releaseId: id,
      module,
      jobId,
      status: "QUEUED",
      input: {
        releaseId: id,
        artistId: release.artistId,
        brandProfileData: release.brandProfile.data,
        release: {
          title: release.title,
          ...(() => {
            const lyrics = (release.metadata as Record<string, unknown>)["lyrics"];
            return typeof lyrics === "string" && lyrics.trim()
              ? { lyricsExcerpt: lyrics.slice(0, 500) }
              : {};
          })(),
        },
      },
    },
  });

  const queue = getAiJobsQueue();
  await queue.add(
    module,
    {
      jobId: aiJob.id,
      module,
      releaseId: id,
      artistId: release.artistId,
      input: aiJob.input,
    },
    { jobId: aiJob.id, attempts: 3, backoff: { type: "custom" } },
  );

  return NextResponse.json({ ok: true, jobId: aiJob.id });
}
