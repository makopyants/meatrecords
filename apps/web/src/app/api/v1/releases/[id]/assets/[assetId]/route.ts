import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> },
) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id, assetId } = await params;

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const asset = await prisma.asset.findFirst({
    where: { id: assetId, releaseId: id, release: { artist: { userId: user.id } } },
  });
  if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

  await prisma.asset.delete({ where: { id: assetId } });

  return NextResponse.json({ ok: true });
}
