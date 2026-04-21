import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Черновик",
  CONTENT_PENDING: "Генерация...",
  CONTENT_REVIEW: "Проверь контент",
  MODERATION_QUEUE: "На модерации",
  APPROVED: "Одобрен",
  REJECTED: "Отклонён",
  DISTRIBUTING: "Дистрибьюция",
  LIVE: "Опубликован",
};

export default async function ReleasesPage() {
  const session = await auth();

  const releases = await prisma.release.findMany({
    where: { artist: { user: { email: session!.user.email } }, deletedAt: null },
    include: { artist: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Релизы</h1>
        <Link href="/releases/new" className={buttonVariants({ size: "sm" })}>
          + Новый релиз
        </Link>
      </div>

      {releases.length === 0 ? (
        <p className="text-sm text-muted-foreground">Нет релизов.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {releases.map((release) => (
            <Link
              key={release.id}
              href={`/releases/${release.id}`}
              className="flex items-center justify-between rounded-lg border px-4 py-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{release.title}</span>
                <span className="text-sm text-muted-foreground">{release.artist.name}</span>
              </div>
              <Badge variant="outline">{STATUS_LABEL[release.status] ?? release.status}</Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
