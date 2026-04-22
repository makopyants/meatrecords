import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ReleaseActions } from "./release-actions";
import { ModuleSection } from "./module-section";
import { TrackSection } from "./track-section";
import { PendingPoller } from "./pending-poller";

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

export default async function ReleasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const release = await prisma.release.findFirst({
    where: { id, artist: { user: { email: session!.user.email } }, deletedAt: null },
    include: {
      artist: { select: { name: true } },
      assets: true,
      generatedContents: { orderBy: { createdAt: "desc" } },
      aiJobs: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!release) notFound();

  const pipeline = release.pipelineConfig as {
    modules?: { cover?: boolean; social?: boolean; teaser?: boolean };
  };
  const enabledModules = (["COVER", "SOCIAL", "TEASER"] as const).filter(
    (mod) => pipeline.modules?.[mod.toLowerCase() as "cover" | "social" | "teaser"] !== false,
  );

  const audioAsset = release.assets.find((a) => a.kind === "AUDIO_MASTER") ?? null;
  const coverAsset = release.assets.find((a) => a.kind === "COVER") ?? null;
  const hasAudio = !!audioAsset;
  const hasActiveJobs = release.aiJobs.some((j) => j.status === "QUEUED" || j.status === "RUNNING");
  const isPending = release.status === "CONTENT_PENDING" || hasActiveJobs;

  const latestContentByModule = new Map(
    (["COVER", "SOCIAL", "TEASER"] as const).map((mod) => [
      mod,
      release.generatedContents.find((c) => c.module === mod) ?? null,
    ]),
  );
  const hasUnreviewed = enabledModules.some(
    (mod) => latestContentByModule.get(mod)?.status === "READY",
  );
  const canSubmit = !hasActiveJobs && !hasUnreviewed;

  const metadata = (release.metadata ?? {}) as Record<string, unknown>;
  const lyrics = typeof metadata["lyrics"] === "string" ? metadata["lyrics"] : "";

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      {isPending && <PendingPoller />}

      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">{release.artist.name}</p>
          <h1 className="text-2xl font-bold">{release.title}</h1>
        </div>
        <Badge variant={STATUS_VARIANT[release.status] ?? "outline"} className="mt-1 shrink-0">
          {STATUS_LABEL[release.status] ?? release.status}
        </Badge>
      </div>

      {release.status === "DRAFT" && (
        <>
          <Separator />
          <TrackSection
            releaseId={release.id}
            audioAsset={audioAsset ? { id: audioAsset.id, fileName: audioAsset.fileName, sizeBytes: audioAsset.sizeBytes } : null}
            coverAsset={coverAsset ? { id: coverAsset.id, url: coverAsset.url } : null}
            initialLyrics={lyrics}
          />
        </>
      )}

      {release.status !== "DRAFT" && (
        <>
          <ReleaseActions
            releaseId={release.id}
            status={release.status}
            hasAudio={hasAudio}
            canSubmit={canSubmit}
            hasActiveJobs={hasActiveJobs}
            hasUnreviewed={hasUnreviewed}
          />

          <Separator />
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                AI-контент
              </h2>
              {isPending && (
                <p className="text-xs text-muted-foreground animate-pulse">
                  Обновляется автоматически...
                </p>
              )}
            </div>
            {enabledModules.map((mod) => {
              const content = release.generatedContents.find((c) => c.module === mod);
              const job = release.aiJobs.find((j) => j.module === mod);
              return (
                <ModuleSection
                  key={mod}
                  releaseId={release.id}
                  module={mod}
                  content={content ? { id: content.id, status: content.status, payload: content.payload } : null}
                  jobStatus={job?.status ?? null}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
