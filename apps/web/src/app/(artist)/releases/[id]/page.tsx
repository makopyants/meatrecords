import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ReleaseActions } from "./release-actions";
import { ModuleSection } from "./module-section";
import { AudioUpload } from "./audio-upload";

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
  const enabledModules = [
    pipeline.modules?.cover !== false && "COVER",
    pipeline.modules?.social !== false && "SOCIAL",
    pipeline.modules?.teaser !== false && "TEASER",
  ].filter(Boolean) as string[];

  const hasAudio = release.assets.some((a) => a.kind === "AUDIO_MASTER");

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">{release.artist.name}</p>
          <h1 className="text-2xl font-bold">{release.title}</h1>
        </div>
        <Badge variant={STATUS_VARIANT[release.status] ?? "outline"} className="mt-1 shrink-0">
          {STATUS_LABEL[release.status] ?? release.status}
        </Badge>
      </div>

      <ReleaseActions
        releaseId={release.id}
        status={release.status}
        hasAudio={hasAudio}
      />

      {release.status !== "DRAFT" && (
        <>
          <Separator />
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              AI-контент
            </h2>
            {enabledModules.map((mod) => {
              const content = release.generatedContents.find((c) => c.module === mod);
              const job = release.aiJobs.find((j) => j.module === mod);
              return (
                <ModuleSection
                  key={mod}
                  releaseId={release.id}
                  module={mod}
                  content={content ?? null}
                  jobStatus={job?.status ?? null}
                />
              );
            })}
          </div>
        </>
      )}

      {release.status === "DRAFT" && (
        <>
          <Separator />
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Аудиофайл</h2>
            <AudioUpload releaseId={release.id} hasAudio={hasAudio} />
          </div>
        </>
      )}
    </div>
  );
}
