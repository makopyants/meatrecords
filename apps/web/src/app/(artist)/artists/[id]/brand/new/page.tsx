import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { BrandForm } from "./brand-form";
import type { BrandProfileV1 } from "@repo/shared";

export default async function NewBrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const artist = await prisma.artist.findFirst({
    where: { id, user: { email: session!.user.email }, deletedAt: null },
    include: { currentBrand: true },
  });
  if (!artist) notFound();

  const existing = artist.currentBrand
    ? (artist.currentBrand.data as unknown as BrandProfileV1)
    : null;

  const isUpdate = !!existing;

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold">
          {isUpdate ? "Обновить бренд-профиль" : "Настрой свой бренд"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isUpdate
            ? "Измени то что нужно — остальное останется как есть."
            : "5 вопросов — и AI будет знать как выглядит твоя музыка."}
        </p>
      </div>
      <BrandForm artistId={artist.id} defaultName={artist.name} existing={existing} />
    </div>
  );
}
