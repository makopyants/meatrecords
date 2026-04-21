"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MODULE_LABEL: Record<string, string> = {
  COVER: "Обложка",
  SOCIAL: "Посты",
  TEASER: "Тизер",
  BRAND: "Бренд",
};

const JOB_STATUS_LABEL: Record<string, string> = {
  QUEUED: "В очереди",
  RUNNING: "Генерируется...",
  SUCCEEDED: "Завершено",
  FAILED: "Ошибка",
};

// ── Payload shapes ────────────────────────────────────────────────────────────

interface CoverPayload {
  covers: Array<{ url: string; prompt: string; variation: string }>;
}

interface SocialPayload {
  posts: Array<{ platform: string; text: string; hashtags: string[]; imageUrl?: string }>;
}

interface TeaserPayload {
  videoUrl: string;
  thumbnailUrl: string;
  durationSec: number;
}

// ── Sub-renderers ─────────────────────────────────────────────────────────────

function CoverContent({ payload }: { payload: CoverPayload }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {payload.covers.map((cover, i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="aspect-square rounded-lg overflow-hidden bg-muted border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover.url} alt={`Cover ${i + 1}`} className="w-full h-full object-cover" />
          </div>
          <p className="text-xs text-muted-foreground truncate">{cover.variation}</p>
        </div>
      ))}
    </div>
  );
}

function SocialContent({ payload }: { payload: SocialPayload }) {
  const PLATFORM_LABEL: Record<string, string> = {
    vk: "VK",
    telegram: "Telegram",
    instagram: "Instagram",
    youtube: "YouTube",
    tiktok: "TikTok",
  };

  return (
    <div className="flex flex-col gap-3">
      {payload.posts.map((post, i) => (
        <div key={i} className="rounded-lg border p-3 flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            {PLATFORM_LABEL[post.platform] ?? post.platform}
          </p>
          <p className="text-sm whitespace-pre-wrap">{post.text}</p>
          {post.hashtags.length > 0 && (
            <p className="text-xs text-primary">
              {post.hashtags.map((h) => `#${h}`).join(" ")}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function TeaserContent({ payload }: { payload: TeaserPayload }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-video rounded-lg overflow-hidden bg-muted border max-w-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={payload.thumbnailUrl} alt="Teaser thumbnail" className="w-full h-full object-cover" />
      </div>
      <p className="text-xs text-muted-foreground">{payload.durationSec} сек</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  releaseId: string;
  module: string;
  content: { id: string; status: string; payload: unknown } | null;
  jobStatus: string | null;
}

export function ModuleSection({ module, content, jobStatus }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const label = MODULE_LABEL[module] ?? module;
  const isReady = content?.status === "READY";
  const isApproved = content?.status === "APPROVED";
  const isRejected = content?.status === "REJECTED";

  async function setStatus(status: "READY" | "APPROVED" | "REJECTED") {
    if (!content) return;
    setPending(true);
    await fetch(`/api/v1/generated-contents/${content.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
    setPending(false);
  }

  function renderPayload() {
    if (!content) return null;
    const p = content.payload as Record<string, unknown>;

    if (module === "COVER" && "covers" in p) {
      return <CoverContent payload={p as unknown as CoverPayload} />;
    }
    if (module === "SOCIAL" && "posts" in p) {
      return <SocialContent payload={p as unknown as SocialPayload} />;
    }
    if (module === "TEASER" && "videoUrl" in p) {
      return <TeaserContent payload={p as unknown as TeaserPayload} />;
    }
    return (
      <pre className="text-xs bg-muted rounded p-2 overflow-auto max-h-40">
        {JSON.stringify(p, null, 2)}
      </pre>
    );
  }

  function statusBadge() {
    if (isApproved) return <Badge variant="default">Одобрено</Badge>;
    if (isRejected) return <Badge variant="destructive">Отклонено</Badge>;
    if (isReady) return <Badge variant="secondary">Готово</Badge>;
    if (jobStatus === "FAILED") return <Badge variant="destructive">Ошибка</Badge>;
    if (jobStatus) return <Badge variant="secondary">{JOB_STATUS_LABEL[jobStatus] ?? jobStatus}</Badge>;
    return <Badge variant="outline">Не запущено</Badge>;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{label}</CardTitle>
          {statusBadge()}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!content && !jobStatus && (
          <p className="text-sm text-muted-foreground">
            Будет сгенерировано автоматически.
          </p>
        )}

        {(jobStatus === "QUEUED" || jobStatus === "RUNNING") && (
          <p className="text-sm text-muted-foreground animate-pulse">
            {JOB_STATUS_LABEL[jobStatus]}...
          </p>
        )}

        {jobStatus === "FAILED" && (
          <p className="text-sm text-destructive">Ошибка при генерации.</p>
        )}

        {content && renderPayload()}

        {(isReady || isRejected || isApproved) && (
          <div className="flex gap-2 pt-1">
            {!isApproved && (
              <Button
                size="sm"
                disabled={pending}
                onClick={() => void setStatus("APPROVED")}
              >
                Одобрить
              </Button>
            )}
            {!isRejected && (
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => void setStatus("REJECTED")}
              >
                Отклонить
              </Button>
            )}
            {isRejected && (
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => void setStatus("READY")}
              >
                ← Вернуть
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
