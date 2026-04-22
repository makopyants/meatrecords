import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { z } from "zod";

const SelectLogoSchema = z.object({
  variantIndex: z.number().int().min(0).max(2),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id: artistId } = await params;
  const body: unknown = await req.json();
  const parsed = SelectLogoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const artist = await prisma.artist.findFirst({
    where: { id: artistId, userId: user.id, deletedAt: null },
    include: { currentBrand: true },
  });
  if (!artist?.currentBrand) {
    return NextResponse.json({ error: "Brand profile not found" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = artist.currentBrand.data as any;
  const variants: Array<{ prompt: string; imageUrl: string }> | undefined =
    data?.identity?.logomarkVariants;

  if (!variants || variants.length === 0) {
    return NextResponse.json({ error: "No logo variants available" }, { status: 409 });
  }

  const { variantIndex } = parsed.data;
  const selected = variants[variantIndex];
  if (!selected) {
    return NextResponse.json({ error: "Invalid variant index" }, { status: 400 });
  }

  const logomark = {
    prompt: selected.prompt,
    imageUrl: selected.imageUrl,
    backgroundVariants: ["dark", "light", "transparent"] as const,
  };

  const updated = await prisma.brandProfile.update({
    where: { id: artist.currentBrand.id },
    data: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { ...data, identity: { ...data.identity, logomark } } as any,
    },
  });

  return NextResponse.json(updated);
}
