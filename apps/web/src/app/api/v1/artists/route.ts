import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { CreateArtistSchema } from "@repo/shared";

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body: unknown = await req.json();
  const parsed = CreateArtistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: session!.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const existing = await prisma.artist.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) {
    return NextResponse.json({ error: "Slug уже занят" }, { status: 409 });
  }

  const artist = await prisma.artist.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      slug: parsed.data.slug,
    },
  });

  return NextResponse.json(artist, { status: 201 });
}
