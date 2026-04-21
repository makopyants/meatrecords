import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { CreateReleaseSchema, PipelineConfigSchema } from "@repo/shared";

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body: unknown = await req.json();
  const parsed = CreateReleaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const artist = await prisma.artist.findFirst({
    where: { id: parsed.data.artistId, userId: user.id, deletedAt: null },
  });
  if (!artist) return NextResponse.json({ error: "Artist not found" }, { status: 404 });

  if (!artist.currentBrandId) {
    return NextResponse.json(
      { error: "У артиста нет активного BrandProfile. Сначала создай бренд." },
      { status: 400 },
    );
  }

  const pipelineConfig = PipelineConfigSchema.parse(parsed.data.pipelineConfig ?? {});

  const release = await prisma.release.create({
    data: {
      artistId: artist.id,
      brandProfileId: artist.currentBrandId,
      title: parsed.data.title,
      pipelineConfig,
    },
  });

  return NextResponse.json(release, { status: 201 });
}
