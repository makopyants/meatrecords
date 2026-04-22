"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RegenLogoButton({ artistId }: { artistId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleRegen() {
    setPending(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/artists/${artistId}/brand/regenerate-logo`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? `Ошибка ${String(res.status)}`);
        return;
      }
      router.refresh();
    } catch {
      setError("Сетевая ошибка");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => void handleRegen()}
        disabled={pending}
        className="text-muted-foreground"
      >
        <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${pending ? "animate-spin" : ""}`} />
        {pending ? "Запускаем..." : "Новые варианты"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
