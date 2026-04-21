"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface Props {
  artists: { id: string; name: string }[];
}

export function NewReleaseForm({ artists }: Props) {
  const router = useRouter();
  const [artistId, setArtistId] = useState(artists[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [modules, setModules] = useState({ cover: true, social: true, teaser: true });
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");

    const res = await fetch("/api/v1/releases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        artistId,
        title,
        pipelineConfig: { modules },
      }),
    });

    if (res.ok) {
      const data = await res.json() as { id: string };
      router.push(`/releases/${data.id}`);
    } else {
      const data = await res.json() as { error: string };
      setError(typeof data.error === "string" ? data.error : "Ошибка создания релиза");
    }
    setPending(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Основная информация</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="artist">Артист</Label>
            <select
              id="artist"
              value={artistId}
              onChange={(e) => setArtistId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            >
              {artists.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Название</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название трека"
              required
              autoFocus
            />
          </div>

          <Separator />

          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">AI-модули</p>
            {(["cover", "social", "teaser"] as const).map((mod) => (
              <label key={mod} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={modules[mod]}
                  onChange={(e) => setModules((m) => ({ ...m, [mod]: e.target.checked }))}
                  className="h-4 w-4 rounded border"
                />
                <span className="text-sm capitalize">{mod === "cover" ? "Обложка" : mod === "social" ? "Соцсети" : "Видеотизер"}</span>
              </label>
            ))}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Отмена
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Создаём..." : "Создать релиз"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
