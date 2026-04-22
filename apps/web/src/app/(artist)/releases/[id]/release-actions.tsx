"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { ReleaseEvent } from "@repo/shared";

interface Props {
  releaseId: string;
  status: string;
  hasAudio: boolean;
  canSubmit: boolean;
  hasActiveJobs: boolean;
  hasUnreviewed: boolean;
}

async function transition(releaseId: string, event: ReleaseEvent, reason?: string) {
  const res = await fetch(`/api/v1/releases/${releaseId}/transition`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, reason }),
  });
  return res;
}

export function ReleaseActions({ releaseId, status, hasAudio, canSubmit, hasActiveJobs, hasUnreviewed }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function act(event: ReleaseEvent, reason?: string) {
    setPending(true);
    setError("");
    const res = await transition(releaseId, event, reason);
    if (!res.ok) {
      const data = await res.json() as { error: string };
      setError(data.error ?? "Ошибка");
    } else {
      router.refresh();
    }
    setPending(false);
  }

  return (
    <div className="flex flex-col gap-2">
      {status === "DRAFT" && (
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            disabled={pending || !hasAudio}
            onClick={() => void act("submit_for_generation")}
            title={!hasAudio ? "Сначала загрузи аудиофайл" : undefined}
          >
            Запустить генерацию
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending || !hasAudio}
            onClick={() => void act("submit_skip_ai")}
          >
            Пропустить AI → Модерация
          </Button>
        </div>
      )}

      {status === "CONTENT_PENDING" && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => void act("cancel_generation")}
        >
          Отменить генерацию
        </Button>
      )}

      {status === "CONTENT_REVIEW" && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              disabled={pending || !canSubmit}
              onClick={() => void act("submit_to_moderation")}
              title={
                hasActiveJobs ? "Дождись завершения генерации" :
                hasUnreviewed ? "Одобри или отклони все модули" :
                undefined
              }
            >
              Отправить на модерацию
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => void act("back_to_edit")}>
              Вернуть в черновик
            </Button>
          </div>
          {!canSubmit && (
            <p className="text-xs text-muted-foreground">
              {hasActiveJobs
                ? "⏳ Генерация ещё идёт — дождись завершения."
                : "⚠ Есть неодобренные модули — одобри или отклони каждый."}
            </p>
          )}
        </div>
      )}

      {status === "REJECTED" && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => void act("revise")}>
          Переработать (→ черновик)
        </Button>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
