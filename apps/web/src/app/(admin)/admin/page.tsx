import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function AdminQueuePage() {
  const releases = await prisma.release.findMany({
    where: { status: "MODERATION_QUEUE", deletedAt: null },
    include: { artist: true },
    orderBy: { updatedAt: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Очередь модерации</h1>
      {releases.length === 0 ? (
        <p className="text-sm text-muted-foreground">Нет релизов на модерации.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {releases.map((release) => (
            <Link
              key={release.id}
              href={`/admin/releases/${release.id}`}
              className="flex items-center justify-between rounded-lg border px-4 py-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{release.title}</span>
                <span className="text-sm text-muted-foreground">{release.artist.name}</span>
              </div>
              <Badge variant="outline">На модерации</Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
