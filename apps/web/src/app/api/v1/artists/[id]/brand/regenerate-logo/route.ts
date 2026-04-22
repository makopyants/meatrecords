import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { getAiJobsQueue } from "@/lib/queue";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id: artistId } = await params;

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const artist = await prisma.artist.findFirst({
    where: { id: artistId, userId: user.id, deletedAt: null },
    include: { currentBrand: true },
  });
  if (!artist?.currentBrand) {
    return NextResponse.json({ error: "Brand profile not found" }, { status: 404 });
  }

  const bp = artist.currentBrand;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = bp.data as any;

  // Clear existing logo data so UI shows "generating"
  await prisma.brandProfile.update({
    where: { id: bp.id },
    data: {
      data: {
        ...data,
        identity: { ...data.identity, logomark: null, logomarkVariants: undefined },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    },
  });

  // Queue new BRAND job
  const jobId = `brand-logo-regen-${bp.id}-${Date.now()}`;
  const aiJob = await prisma.aiJob.create({
    data: {
      module: "BRAND",
      jobId,
      status: "QUEUED",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      input: { brandProfileId: bp.id, artistId, brandProfileData: bp.data } as any,
    },
  });

  const queue = getAiJobsQueue();
  await queue.add(
    "BRAND",
    { jobId: aiJob.id, module: "BRAND", artistId, input: aiJob.input },
    { jobId: aiJob.id, attempts: 3, backoff: { type: "custom" } },
  );

  return NextResponse.json({ ok: true });
}
