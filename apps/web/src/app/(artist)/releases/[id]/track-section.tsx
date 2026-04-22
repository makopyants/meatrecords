"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ReleaseEvent } from "@repo/shared";

interface AudioAsset {
  id: string;
  fileName: string;
  sizeBytes: number;
}

interface CoverAsset {
  id: string;
  url: string;
}

interface Props {
  releaseId: string;
  audioAsset: AudioAsset | null;
  coverAsset: CoverAsset | null;
  initialLyrics: string;
}

const AUDIO_ACCEPT = ".mp3,.wav,.flac,.aiff,.m4a,audio/*";
const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TrackSection({ releaseId, audioAsset, coverAsset, initialLyrics }: Props) {
  const router = useRouter();
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [audioUploading, setAudioUploading] = useState(false);
  const [audioError, setAudioError] = useState("");
  const [replacingAudio, setReplacingAudio] = useState(false);

  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState("");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [lyrics, setLyrics] = useState(initialLyrics);
  const [lyricsSaving, setLyricsSaving] = useState(false);
  const [lyricsSaved, setLyricsSaved] = useState(false);

  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState("");

  const hasAudio = !!audioAsset && !replacingAudio;
  const currentCoverUrl = coverPreview ?? coverAsset?.url ?? null;

  async function handleAudioUpload(file: File) {
    setAudioUploading(true);
    setAudioError("");
    try {
      const urlRes = await fetch(`/api/v1/releases/${releaseId}/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, mimeType: file.type || "audio/mpeg", kind: "AUDIO_MASTER", sizeBytes: file.size }),
      });
      const urlData = await urlRes.json() as { devMode?: boolean; uploadUrl?: string; key?: string };
      if (urlData.devMode) { setReplacingAudio(false); router.refresh(); return; }
      if (!urlData.uploadUrl) { setAudioError("Не удалось получить URL для загрузки"); return; }
      await fetch(urlData.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type || "audio/mpeg" } });
      await fetch(`/api/v1/releases/${releaseId}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: urlData.key, filename: file.name, mimeType: file.type || "audio/mpeg", sizeBytes: file.size, kind: "AUDIO_MASTER" }),
      });
      setReplacingAudio(false);
      router.refresh();
    } catch { setAudioError("Ошибка загрузки"); }
    finally { setAudioUploading(false); }
  }

  async function handleCoverUpload(file: File) {
    setCoverUploading(true);
    setCoverError("");
    // Show local preview immediately
    setCoverPreview(URL.createObjectURL(file));
    try {
      const urlRes = await fetch(`/api/v1/releases/${releaseId}/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, mimeType: file.type, kind: "COVER", sizeBytes: file.size }),
      });
      const urlData = await urlRes.json() as { devMode?: boolean; uploadUrl?: string; key?: string };
      if (urlData.devMode) { router.refresh(); return; }
      if (!urlData.uploadUrl) { setCoverError("Не удалось получить URL"); setCoverPreview(null); return; }
      await fetch(urlData.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      await fetch(`/api/v1/releases/${releaseId}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: urlData.key, filename: file.name, mimeType: file.type, sizeBytes: file.size, kind: "COVER" }),
      });
      router.refresh();
    } catch { setCoverError("Ошибка загрузки"); setCoverPreview(null); }
    finally { setCoverUploading(false); }
  }

  async function deleteAsset(assetId: string, kind: "audio" | "cover") {
    setActionPending(true);
    await fetch(`/api/v1/releases/${releaseId}/assets/${assetId}`, { method: "DELETE" });
    if (kind === "cover") setCoverPreview(null);
    router.refresh();
    setActionPending(false);
  }

  async function saveLyrics() {
    setLyricsSaving(true);
    await fetch(`/api/v1/releases/${releaseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lyrics }),
    });
    setLyricsSaving(false);
    setLyricsSaved(true);
    setTimeout(() => setLyricsSaved(false), 2000);
  }

  async function act(event: ReleaseEvent) {
    setActionPending(true);
    setActionError("");
    const res = await fetch(`/api/v1/releases/${releaseId}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event }),
    });
    if (!res.ok) {
      const data = await res.json() as { error: string };
      setActionError(data.error ?? "Ошибка");
    } else {
      router.refresh();
    }
    setActionPending(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_160px] gap-6 items-start">

        {/* Left column: audio + lyrics */}
        <div className="flex flex-col gap-6">

          {/* Audio */}
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Аудиофайл
            </h2>
            {hasAudio ? (
              <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-medium truncate">{audioAsset.fileName}</span>
                  <span className="text-xs text-muted-foreground">{formatBytes(audioAsset.sizeBytes)}</span>
                </div>
                <div className="flex gap-2 ml-2 shrink-0">
                  <Button size="sm" variant="ghost" disabled={actionPending} onClick={() => setReplacingAudio(true)}>
                    Заменить
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    className="text-destructive hover:text-destructive"
                    disabled={actionPending}
                    onClick={() => void deleteAsset(audioAsset.id, "audio")}
                  >
                    Удалить
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <input ref={audioInputRef} type="file" accept={AUDIO_ACCEPT} className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleAudioUpload(f); e.target.value = ""; }}
                />
                <div
                  className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-8 hover:bg-muted/50 transition-colors"
                  onClick={() => audioInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) void handleAudioUpload(f); }}
                >
                  {audioUploading
                    ? <p className="text-sm text-muted-foreground animate-pulse">Загружается...</p>
                    : <>
                        <p className="text-sm font-medium">Загрузить аудиофайл</p>
                        <p className="text-xs text-muted-foreground mt-1">MP3, WAV, FLAC, AIFF — перетащи или кликни</p>
                      </>
                  }
                </div>
                {replacingAudio && (
                  <Button size="sm" variant="ghost" onClick={() => setReplacingAudio(false)}>Отмена</Button>
                )}
                {audioError && <p className="text-sm text-destructive">{audioError}</p>}
              </div>
            )}
          </div>

          {/* Lyrics */}
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Текст песни <span className="normal-case font-normal">(необязательно)</span>
            </h2>
            <Textarea
              placeholder="Вставь текст — AI использует его при генерации обложки и постов"
              className="min-h-32 resize-y font-mono text-xs"
              value={lyrics}
              onChange={(e) => { setLyrics(e.target.value); setLyricsSaved(false); }}
            />
            <Button size="sm" variant="outline" className="self-start" disabled={lyricsSaving} onClick={() => void saveLyrics()}>
              {lyricsSaving ? "Сохраняется..." : lyricsSaved ? "Сохранено ✓" : "Сохранить текст"}
            </Button>
          </div>
        </div>

        {/* Right column: cover */}
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Обложка <span className="normal-case font-normal">(необязательно)</span>
          </h2>
          <input ref={coverInputRef} type="file" accept={IMAGE_ACCEPT} className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleCoverUpload(f); e.target.value = ""; }}
          />
          {currentCoverUrl ? (
            <div className="relative group">
              <div className="aspect-square w-full rounded-lg overflow-hidden border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={currentCoverUrl} alt="Cover" className="w-full h-full object-cover" />
              </div>
              <div className="absolute inset-0 rounded-lg bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => coverInputRef.current?.click()} disabled={coverUploading}>
                  Заменить
                </Button>
                {coverAsset && (
                  <Button
                    size="sm" variant="ghost"
                    className="text-white hover:text-white hover:bg-white/20"
                    disabled={actionPending}
                    onClick={() => void deleteAsset(coverAsset.id, "cover")}
                  >
                    Удалить
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div
              className="aspect-square w-full rounded-lg border border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => coverInputRef.current?.click()}
            >
              {coverUploading
                ? <p className="text-xs text-muted-foreground animate-pulse text-center px-2">Загружается...</p>
                : <>
                    <p className="text-2xl text-muted-foreground">+</p>
                    <p className="text-xs text-muted-foreground text-center px-2">JPG, PNG, WebP</p>
                  </>
              }
            </div>
          )}
          {coverError && <p className="text-xs text-destructive">{coverError}</p>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            disabled={actionPending || !hasAudio}
            title={!hasAudio ? "Сначала загрузи аудиофайл" : undefined}
            onClick={() => void act("submit_for_generation")}
          >
            Запустить генерацию
          </Button>
          <Button size="sm" variant="outline" disabled={actionPending || !hasAudio} onClick={() => void act("submit_skip_ai")}>
            Пропустить AI → Модерация
          </Button>
        </div>
        {actionError && <p className="text-sm text-destructive">{actionError}</p>}
      </div>
    </div>
  );
}
