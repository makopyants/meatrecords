"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  releaseId: string;
  hasCover: boolean;
}

export function ModerationActions({ releaseId, hasCover }: Props) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(action: "approve" | "reject" | "send_back") {
    if ((action === "reject" || action === "send_back") && !reason.trim()) {
      setError("Укажи причину");
      return;
    }
    setPending(true);
    setError("");

    const res = await fetch(`/api/v1/admin/releases/${releaseId}/moderate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason: reason.trim() || undefined }),
    });

    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      const data = await res.json() as { error: string };
      setError(data.error ?? "Ошибка");
    }
    setPending(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Решение</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reason">Комментарий (обязателен при отказе)</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Причина отказа или замечания..."
            rows={3}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            disabled={pending || !hasCover}
            onClick={() => void submit("approve")}
            title={!hasCover ? "Нет обложки" : undefined}
          >
            Одобрить
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => void submit("send_back")}
          >
            Вернуть на доработку
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => void submit("reject")}
          >
            Отклонить
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
