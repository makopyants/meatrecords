import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ModerationActions } from "./moderation-actions";

export default async function AdminReleasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user.isModerator) notFound();

  const release = await prisma.release.findFirst({
    where: { id, deletedAt: null },
    include: {
      artist: { select: { name: true, slug: true } },
      assets: true,
      generatedContents: { orderBy: { createdAt: "desc" } },
      moderationRecords: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!release) notFound();

  const hasCover = release.assets.some((a) => a.kind === "COVER");

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">{release.artist.name}</p>
          <h1 className="text-2xl font-bold">{release.title}</h1>
        </div>
        <Badge className="mt-1 shrink-0">{release.status}</Badge>
      </div>

      {release.status === "MODERATION_QUEUE" && (
        <ModerationActions releaseId={release.id} hasCover={hasCover} />
      )}

      {release.moderationRecords.length > 0 && (
        <>
          <Separator />
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              История модерации
            </h2>
            {release.moderationRecords.map((rec) => (
              <div key={rec.id} className="flex flex-col gap-0.5 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{rec.action}</Badge>
                  <span className="text-muted-foreground">{rec.moderatorEmail}</span>
                  <span className="text-muted-foreground">
                    {new Date(rec.createdAt).toLocaleDateString("ru-RU")}
                  </span>
                </div>
                {rec.reason && <p className="text-muted-foreground pl-1">{rec.reason}</p>}
              </div>
            ))}
          </div>
        </>
      )}

      <Separator />
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Материалы</h2>
        {release.assets.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет загруженных файлов.</p>
        ) : (
          release.assets.map((asset) => (
            <div key={asset.id} className="flex items-center justify-between text-sm">
              <span>{asset.fileName}</span>
              <Badge variant="outline">{asset.kind}</Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
