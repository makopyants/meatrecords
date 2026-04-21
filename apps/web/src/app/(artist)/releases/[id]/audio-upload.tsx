"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Props {
  releaseId: string;
  hasAudio: boolean;
}

const ACCEPTED = ".mp3,.wav,.flac,.aiff,.m4a,audio/*";

export function AudioUpload({ releaseId, hasAudio }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [filename, setFilename] = useState("");

  async function handleFile(file: File) {
    setUploading(true);
    setError("");
    setFilename(file.name);

    try {
      const urlRes = await fetch(`/api/v1/releases/${releaseId}/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type || "audio/mpeg",
          kind: "AUDIO_MASTER",
          sizeBytes: file.size,
        }),
      });

      const urlData = await urlRes.json() as { devMode?: boolean; uploadUrl?: string; key?: string; asset?: unknown };

      // Dev mode — R2 не настроен, asset уже создан на сервере
      if (urlData.devMode) {
        router.refresh();
        return;
      }

      if (!urlRes.ok || !urlData.uploadUrl) {
        setError("Не удалось получить URL для загрузки");
        return;
      }

      // Upload directly to R2
      const uploadRes = await fetch(urlData.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "audio/mpeg" },
      });

      if (!uploadRes.ok) {
        setError("Ошибка загрузки файла");
        return;
      }

      // Confirm asset
      await fetch(`/api/v1/releases/${releaseId}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: urlData.key,
          filename: file.name,
          mimeType: file.type || "audio/mpeg",
          sizeBytes: file.size,
          kind: "AUDIO_MASTER",
        }),
      });

      router.refresh();
    } catch {
      setError("Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  }

  if (hasAudio) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-green-600">✓</span> Аудиофайл загружен
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
      />
      <div
        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-8 hover:bg-muted/50 transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f) void handleFile(f);
        }}
      >
        {uploading ? (
          <p className="text-sm text-muted-foreground animate-pulse">Загружаем {filename}...</p>
        ) : (
          <>
            <p className="text-sm font-medium">Загрузить аудиофайл</p>
            <p className="text-xs text-muted-foreground mt-1">MP3, WAV, FLAC, AIFF — перетащи или кликни</p>
          </>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
        Выбрать файл
      </Button>
    </div>
  );
}
