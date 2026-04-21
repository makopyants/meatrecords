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
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <p className="text-sm text-muted-foreground">{artist.name}</p>
        <h1 className="text-2xl font-bold">Создать BrandProfile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          BrandProfile — это основа всего AI-контента. Заполни один раз, используется во всех релизах.
        </p>
      </div>
      <BrandForm artistId={artist.id} />
    </div>
  );
}
