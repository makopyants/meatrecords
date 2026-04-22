import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { BrandProfileV1Schema } from "@repo/shared";
import { getAiJobsQueue } from "@/lib/queue";
import { z } from "zod";

const CreateBrandSchema = z.object({
  data: BrandProfileV1Schema,
  lockAndSetCurrent: z.boolean().default(true),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id: artistId } = await params;
  const body: unknown = await req.json();
  const parsed = CreateBrandSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const artist = await prisma.artist.findFirst({
    where: { id: artistId, userId: user.id, deletedAt: null },
  });
  if (!artist) return NextResponse.json({ error: "Artist not found" }, { status: 404 });

  const lastBrand = await prisma.brandProfile.findFirst({
    where: { artistId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (lastBrand?.version ?? 0) + 1;

  const now = new Date();
  const { lockAndSetCurrent } = parsed.data;

  const brand = await prisma.brandProfile.create({
    data: {
      artistId,
      version,
      status: lockAndSetCurrent ? "LOCKED" : "DRAFT",
      data: parsed.data.data,
      lockedAt: lockAndSetCurrent ? now : null,
    },
  });

  if (lockAndSetCurrent) {
    await prisma.artist.update({
      where: { id: artistId },
      data: { currentBrandId: brand.id },
    });

    // Queue logo generation
    try {
      const jobId = `brand-logo-${brand.id}`;
      const aiJob = await prisma.aiJob.create({
        data: {
          module: "BRAND",
          jobId,
          status: "QUEUED",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        input: { brandProfileId: brand.id, artistId, brandProfileData: brand.data } as any,
        },
      });
      const queue = getAiJobsQueue();
      await queue.add(
        "BRAND",
        { jobId: aiJob.id, module: "BRAND", artistId, input: aiJob.input },
        { jobId: aiJob.id, attempts: 3, backoff: { type: "custom" } },
      );
      console.log(`[brand] queued logo job=${aiJob.id} for brandProfile=${brand.id}`);
    } catch (e) {
      console.error("[brand] failed to queue logo job:", e);
    }
  }

  return NextResponse.json(brand, { status: 201 });
}
