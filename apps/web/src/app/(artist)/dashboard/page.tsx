import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { BrandProfileV1 } from "@repo/shared";

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

const MOOD_LABEL: Record<string, string> = {
  dark: "Тёмный",
  vibrant: "Яркий",
  muted: "Атмосферный",
  monochrome: "Минимализм",
  light: "Светлый",
};

export default async function DashboardPage() {
  const session = await auth();

  const artists = await prisma.artist.findMany({
    where: { user: { email: session!.user.email }, deletedAt: null },
    include: {
      releases: {
        where: { deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 3,
      },
      currentBrand: { select: { id: true, status: true, version: true, data: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Дашборд</h1>
        <Link href="/artists/new" className={buttonVariants({ size: "sm", variant: "outline" })}>
          + Артист
        </Link>
      </div>

      {artists.length === 0 && (
        <Card>
          <CardContent className="pt-6 flex flex-col gap-3">
            <p className="font-medium">Добро пожаловать!</p>
            <p className="text-sm text-muted-foreground">Создай артиста чтобы начать загружать релизы.</p>
            <Link href="/artists/new" className={buttonVariants({ className: "self-start" })}>
              Создать артиста
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-6">
        {artists.map((artist) => {
          const brand = artist.currentBrand?.data
            ? (artist.currentBrand.data as unknown as BrandProfileV1)
            : null;
          const genres = brand?.audience.positioning.genre ?? [];
          const mood = brand?.visual.palette.mood;
          const palette = brand ? [brand.visual.palette.primary, brand.visual.palette.secondary, brand.visual.palette.accent] : [];
          const initials = artist.name.slice(0, 2).toUpperCase();

          return (
            <div key={artist.id} className="flex flex-col gap-3">
              {/* Artist card */}
              <Link
                href={`/artists/${artist.id}`}
                className="flex items-center gap-4 rounded-xl border p-4 hover:bg-muted/50 transition-colors"
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-muted border flex items-center justify-center overflow-hidden shrink-0">
                  {artist.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={artist.photoUrl} alt={artist.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">{initials}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{artist.name}</span>
                    {palette.length > 0 && (
                      <div className="flex gap-1 ml-1">
                        {palette.map((c) => (
                          <div key={c} className="w-3 h-3 rounded-full border border-border" style={{ background: c }} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {genres.slice(0, 3).map((g) => (
                      <span key={g} className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{g}</span>
                    ))}
                    {mood && (
                      <span className="text-xs text-muted-foreground">{MOOD_LABEL[mood] ?? mood}</span>
                    )}
                    {!artist.currentBrand && (
                      <span className="text-xs text-amber-600">⚠ Нет бренд-профиля</span>
                    )}
                  </div>
                </div>

                <span className="text-xs text-muted-foreground shrink-0">→</span>
              </Link>

              {/* Releases */}
              {artist.releases.length > 0 && (
                <div className="flex flex-col gap-1.5 pl-4 border-l-2 border-border ml-6">
                  {artist.releases.map((release) => (
                    <Link
                      key={release.id}
                      href={`/releases/${release.id}`}
                      className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm truncate">{release.title}</span>
                      <Badge variant={STATUS_VARIANT[release.status] ?? "outline"} className="ml-2 shrink-0 text-xs">
                        {STATUS_LABEL[release.status] ?? release.status}
                      </Badge>
                    </Link>
                  ))}
                  <Link
                    href="/releases/new"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1"
                  >
                    + Новый релиз
                  </Link>
                </div>
              )}

              {artist.releases.length === 0 && (
                <div className="pl-10">
                  <Link
                    href="/releases/new"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    + Создать первый релиз
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
