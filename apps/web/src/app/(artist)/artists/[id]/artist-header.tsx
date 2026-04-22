"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  artistId: string;
  name: string;
  slug: string;
  photoUrl: string | null;
}

export function ArtistHeader({ artistId, name, slug, photoUrl }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(name);
  const [saving, setSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const displayPhoto = photoPreview ?? photoUrl;
  const initials = name.slice(0, 2).toUpperCase();

  async function handlePhotoUpload(file: File) {
    setUploading(true);
    setPhotoPreview(URL.createObjectURL(file));
    try {
      const res = await fetch(`/api/v1/artists/${artistId}/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, mimeType: file.type, sizeBytes: file.size }),
      });
      const data = await res.json() as { devMode?: boolean; photoUrl?: string; uploadUrl?: string; key?: string };
      if (data.devMode) { router.refresh(); return; }
      if (data.uploadUrl && data.photoUrl) {
        await fetch(data.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
        await fetch(`/api/v1/artists/${artistId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoUrl: data.photoUrl }),
        });
        router.refresh();
      }
    } finally {
      setUploading(false);
    }
  }

  async function saveName() {
    setSaving(true);
    await fetch(`/api/v1/artists/${artistId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nameVal }),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-5">
      {/* Avatar */}
      <div className="relative group shrink-0">
        <button
          className="relative w-20 h-20 rounded-full overflow-hidden bg-muted border-2 border-border focus:outline-none"
          onClick={() => fileRef.current?.click()}
          title="Сменить фото"
        >
          {displayPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayPhoto} alt={name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl font-bold text-muted-foreground">{initials}</span>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-xs">{uploading ? "..." : "📷"}</span>
          </div>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void handlePhotoUpload(f); e.target.value = ""; }}
        />
      </div>

      {/* Name + slug */}
      <div className="flex flex-col gap-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              className="h-8 text-lg font-bold w-48"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") void saveName(); if (e.key === "Escape") setEditing(false); }}
            />
            <Button size="sm" disabled={saving || !nameVal.trim()} onClick={() => void saveName()}>
              {saving ? "..." : "✓"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setNameVal(name); }}>✕</Button>
          </div>
        ) : (
          <button
            className="text-2xl font-bold text-left hover:opacity-70 transition-opacity"
            onClick={() => setEditing(true)}
            title="Редактировать имя"
          >
            {name}
          </button>
        )}
        <p className="text-sm text-muted-foreground">@{slug}</p>
      </div>
    </div>
  );
}
