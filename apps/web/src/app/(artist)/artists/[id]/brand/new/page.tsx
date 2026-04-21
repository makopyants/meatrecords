import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { BrandForm } from "./brand-form";

export default async function NewBrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const artist = await prisma.artist.findFirst({
    where: { id, user: { email: session!.user.email }, deletedAt: null },
  });
  if (!artist) notFound();

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold">Настрой свой бренд</h1>
        <p className="text-sm text-muted-foreground mt-1">
          5 вопросов — и AI будет знать как выглядит твоя музыка.
        </p>
      </div>
      <BrandForm artistId={artist.id} defaultName={artist.name} />
    </div>
  );
}
