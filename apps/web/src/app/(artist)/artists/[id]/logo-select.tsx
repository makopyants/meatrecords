"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ZoomIn, Sun, Moon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Variant {
  prompt: string;
  imageUrl: string;
}

interface Props {
  artistId: string;
  variants: Variant[];
}

export function LogoSelect({ artistId, variants }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);
  const [darkBg, setDarkBg] = useState(true);
  const [zoom, setZoom] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});
  const [imgError, setImgError] = useState<Record<number, boolean>>({});

  async function handleConfirm() {
    if (selected === null) return;
    setPending(true);
    setError("");

    const res = await fetch(`/api/v1/artists/${artistId}/brand/select-logo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantIndex: selected }),
    });

    if (res.ok) {
      router.refresh();
    } else {
      const data = (await res.json()) as { error: unknown };
      setError(typeof data.error === "string" ? data.error : "Ошибка");
      setPending(false);
    }
  }

  return (
    <>
      {/* Main selection block */}
      <div className="flex flex-col gap-5 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-5">
        {/* Header row */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold">Выбери логотип</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              AI сгенерировал 3 варианта в стиле твоих жанров — выбери один
            </p>
          </div>

          {/* Dark / light background toggle */}
          <button
            type="button"
            onClick={() => setDarkBg((v) => !v)}
            className="flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            {darkBg ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
            {darkBg ? "Тёмный фон" : "Светлый фон"}
          </button>
        </div>

        {/* Variant cards */}
        <div className="grid grid-cols-3 gap-3">
          {variants.map((v, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSelected(i)}
                onKeyDown={(e) => e.key === "Enter" && setSelected(i)}
                className={cn(
                  "group relative aspect-square w-full overflow-hidden rounded-xl border-2 transition-all cursor-pointer",
                  selected === i
                    ? "border-primary shadow-lg shadow-primary/20 scale-[1.02]"
                    : "border-border hover:border-primary/40 hover:shadow-md",
                )}
              >
                {/* Logo image on toggled background */}
                <div
                  className={cn(
                    "absolute inset-0 transition-colors",
                    darkBg ? "bg-zinc-900" : "bg-white",
                  )}
                />

                {/* Loading skeleton */}
                {!loaded[i] && !imgError[i] && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
                    <span className="text-xs text-muted-foreground/50">Генерируется…</span>
                  </div>
                )}

                {/* Error state */}
                {imgError[i] && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground/60 text-center px-3">Не удалось загрузить</span>
                  </div>
                )}

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={v.imageUrl}
                  alt={`Вариант ${String(i + 1)}`}
                  className={cn(
                    "relative w-full h-full object-contain p-3 transition-opacity",
                    loaded[i] ? "opacity-100" : "opacity-0",
                  )}
                  onLoad={() => setLoaded((prev) => ({ ...prev, [i]: true }))}
                  onError={() => setImgError((prev) => ({ ...prev, [i]: true }))}
                />

                {/* Selected checkmark */}
                <div
                  className={cn(
                    "absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full transition-all",
                    selected === i
                      ? "bg-primary text-primary-foreground scale-100 opacity-100"
                      : "bg-black/30 text-white scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100",
                  )}
                >
                  <Check className="h-3.5 w-3.5" />
                </div>

                {/* Zoom button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoom(i);
                  }}
                  className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>

                {/* Variant number */}
                <div className="absolute top-2 left-2 rounded-full bg-black/40 px-2 py-0.5 text-xs text-white font-medium">
                  {i + 1}
                </div>
              </div>

              {/* Select label under card */}
              <p
                className={cn(
                  "text-center text-xs transition-colors",
                  selected === i ? "text-primary font-medium" : "text-muted-foreground",
                )}
              >
                {selected === i ? "Выбран" : `Вариант ${String(i + 1)}`}
              </p>
            </div>
          ))}
        </div>

        {error && (
          <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {/* CTA */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {selected !== null
              ? `Выбран вариант ${String(selected + 1)} — нажми «Использовать», чтобы сохранить`
              : "Кликни по варианту, чтобы выбрать"}
          </p>
          <Button
            onClick={() => void handleConfirm()}
            disabled={selected === null || pending}
            size="sm"
          >
            {pending ? "Сохраняем..." : "Использовать →"}
          </Button>
        </div>
      </div>

      {/* Zoom modal */}
      {zoom !== null && variants[zoom] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setZoom(null)}
        >
          <div
            className="relative mx-4 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-white/70 text-sm">Вариант {String(zoom + 1)}</p>
              <button
                className="text-white/70 hover:text-white text-sm"
                onClick={() => setZoom(null)}
              >
                Закрыть ✕
              </button>
            </div>

            {/* Show on both backgrounds side by side */}
            <div className="flex gap-3">
              {[{ bg: "bg-zinc-900", label: "Тёмный фон" }, { bg: "bg-white", label: "Светлый фон" }].map(({ bg, label }) => (
                <div key={label} className="flex flex-col gap-1.5 items-center">
                  <div className={cn("w-52 h-52 rounded-xl flex items-center justify-center p-4 relative", bg)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={variants[zoom]!.imageUrl}
                      alt={`Логотип — ${label}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="text-xs text-white/50">{label}</p>
                </div>
              ))}
            </div>

            <Button
              className="w-full"
              onClick={() => { setSelected(zoom); setZoom(null); }}
              variant={selected === zoom ? "secondary" : "default"}
            >
              {selected === zoom ? "Уже выбран" : "Выбрать этот вариант"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
