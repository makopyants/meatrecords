import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { ArtistHeader } from "./artist-header";
import { LogoPoller } from "./logo-poller";
import { LogoViewer } from "./logo-viewer";
import { LogoSelect } from "./logo-select";
import { RegenLogoButton } from "./regen-logo-button";
import type { BrandProfileV1 } from "@repo/shared";

const MOOD_LABEL: Record<string, string> = {
  dark: "Тёмный",
  vibrant: "Яркий",
  muted: "Атмосферный",
  monochrome: "Минимализм",
  light: "Светлый",
};

const RELEASE_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Черновик",
  CONTENT_PENDING: "Генерация...",
  CONTENT_REVIEW: "Проверь контент",
  MODERATION_QUEUE: "На модерации",
  APPROVED: "Одобрен",
  REJECTED: "Отклонён",
  DISTRIBUTING: "Дистрибьюция",
  LIVE: "Опубликован",
};

const RELEASE_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  CONTENT_PENDING: "secondary",
  CONTENT_REVIEW: "secondary",
  MODERATION_QUEUE: "default",
  APPROVED: "default",
  REJECTED: "destructive",
  DISTRIBUTING: "default",
  LIVE: "default",
};

export default async function ArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const artist = await prisma.artist.findFirst({
    where: { id, user: { email: session!.user.email }, deletedAt: null },
    include: {
      currentBrand: true,
      releases: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!artist) notFound();

  const brand = artist.currentBrand ? (artist.currentBrand.data as unknown as BrandProfileV1) : null;
  const logomark = brand?.identity.logomark ?? null;
  const logomarkVariants = brand?.identity.logomarkVariants ?? null;

  // Latest BRAND job status for this brand profile
  const latestLogoJob = artist.currentBrand
    ? await prisma.aiJob.findFirst({
        where: {
          module: "BRAND",
          input: { path: ["brandProfileId"], equals: artist.currentBrand.id },
        },
        orderBy: { createdAt: "desc" },
        select: { status: true, error: true },
      })
    : null;

  const logoJobFailed = latestLogoJob?.status === "FAILED";
  // Polling only while brand exists but variants haven't arrived yet (and job not failed)
  const logoGenerating =
    !!artist.currentBrand &&
    !logomark &&
    (!logomarkVariants || logomarkVariants.length === 0) &&
    !logoJobFailed;

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      {logoGenerating && <LogoPoller />}

      {/* Header */}
      <ArtistHeader
        artistId={artist.id}
        name={artist.name}
        slug={artist.slug}
        photoUrl={artist.photoUrl}
      />

      <Separator />

      {/* Brand Profile */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Бренд-профиль
          </h2>
          <div className="flex gap-2">
            {artist.currentBrand && (
              <Badge variant={artist.currentBrand.status === "LOCKED" ? "default" : "secondary"}>
                {artist.currentBrand.status === "LOCKED" ? `v${artist.currentBrand.version} · Активен` : "Черновик"}
              </Badge>
            )}
            {artist.currentBrand && (
              <RegenLogoButton artistId={id} />
            )}
            <Link
              href={`/artists/${id}/brand/new`}
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              {artist.currentBrand ? "Обновить профиль" : "Создать профиль"}
            </Link>
          </div>
        </div>

        {/* Logo generation failed */}
        {brand && !logomark && logoJobFailed && (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-destructive">Не удалось сгенерировать логотип</p>
              {latestLogoJob?.error && (
                <p className="mt-0.5 text-xs text-muted-foreground font-mono truncate">{latestLogoJob.error}</p>
              )}
            </div>
            <RegenLogoButton artistId={id} />
          </div>
        )}

        {/* Logo variant selection — shown above brand card until user picks one */}
        {brand && !logomark && logomarkVariants && logomarkVariants.length > 0 && (
          <LogoSelect artistId={id} variants={logomarkVariants} />
        )}

        {brand ? (
          <Card>
            <CardContent className="pt-5 flex flex-col gap-4">
              {/* Logo + one-liner row */}
              <div className="flex items-start gap-4">
                {logomark ? (
                  <LogoViewer imageUrl={logomark.imageUrl} artistName={brand.identity.artistName} />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-muted border overflow-hidden shrink-0 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground text-center px-1 animate-pulse">
                      {logomarkVariants && logomarkVariants.length > 0 ? "Выбери вариант" : "Генерируется..."}
                    </span>
                  </div>
                )}
                <p className="text-sm font-medium italic text-muted-foreground pt-1">
                  «{brand.identity.concept.oneLiner}»
                </p>
              </div>

              {/* Visual row */}
              <div className="flex items-center gap-4">
                {/* Palette */}
                <div className="flex gap-1.5">
                  {[brand.visual.palette.primary, brand.visual.palette.secondary, brand.visual.palette.accent].map((c) => (
                    <div
                      key={c}
                      className="h-6 w-6 rounded-full border border-border shadow-sm"
                      style={{ background: c }}
                      title={c}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {MOOD_LABEL[brand.visual.palette.mood] ?? brand.visual.palette.mood}
                </span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  {brand.verbal.language.primary === "ru" ? "Русский" : brand.verbal.language.primary === "en" ? "English" : "Ru/En"}
                </span>
              </div>

              {/* Genre tags */}
              <div className="flex flex-wrap gap-1.5">
                {brand.audience.positioning.genre.map((g) => (
                  <span key={g} className="rounded-full bg-muted px-2.5 py-0.5 text-xs">{g}</span>
                ))}
                {brand.identity.concept.keywords.slice(0, 4).map((k) => (
                  <span key={k} className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground">{k}</span>
                ))}
              </div>

              {/* Platforms */}
              <div className="flex flex-wrap gap-1.5">
                {brand.audience.platforms.map((p) => (
                  <span
                    key={p.name}
                    className={`rounded-full px-2.5 py-0.5 text-xs ${p.priority === "primary" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-5">
              <p className="text-sm text-muted-foreground">
                Бренд-профиль не создан. Без него AI не сможет генерировать контент для релизов.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Separator />

      {/* Releases */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Релизы
          </h2>
          <Link href="/releases/new" className={buttonVariants({ size: "sm" })}>
            + Новый релиз
          </Link>
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
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-medium truncate">{release.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(release.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                </div>
                <Badge variant={RELEASE_STATUS_VARIANT[release.status] ?? "outline"} className="ml-3 shrink-0">
                  {RELEASE_STATUS_LABEL[release.status] ?? release.status}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
