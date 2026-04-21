import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  CONTENT_PENDING: "secondary",
  CONTENT_REVIEW: "secondary",
  MODERATION_QUEUE: "default",
  APPROVED: "default",
  REJECTED: "destructive",
  DISTRIBUTING: "default",
  LIVE: "default",
};

export default async function DashboardPage() {
  const session = await auth();

  const artists = await prisma.artist.findMany({
    where: { user: { email: session!.user.email }, deletedAt: null },
    include: {
      releases: {
        where: { deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 5,
      },
      currentBrand: { select: { id: true } },
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Дашборд</h1>
        <Button asChild size="sm">
          <Link href="/releases/new">+ Новый релиз</Link>
        </Button>
      </div>

      {artists.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Добро пожаловать!</CardTitle>
            <CardDescription>
              Создай артиста чтобы начать загружать релизы.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/artists/new">Создать артиста</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {artists.map((artist) => (
        <section key={artist.id}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{artist.name}</h2>
            {!artist.currentBrand && (
              <Link href={`/artists/${artist.id}/brand/new`}
                className="text-xs text-amber-600 hover:underline">
                ⚠ Нет BrandProfile — создай перед релизом
              </Link>
            )}
          </div>
          {artist.releases.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет релизов.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {artist.releases.map((release) => (
                <Link
                  key={release.id}
                  href={`/releases/${release.id}`}
                  className="flex items-center justify-between rounded-lg border px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <span className="font-medium">{release.title}</span>
                  <Badge variant={STATUS_VARIANT[release.status] ?? "outline"}>
                    {STATUS_LABEL[release.status] ?? release.status}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
