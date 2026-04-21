"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Props {
  artistId: string;
  defaultName?: string;
}

const MOODS = [
  {
    id: "dark",
    label: "Тёмный",
    hint: "меланхолия, ночь, глубина",
    palette: { primary: "#0A0A0A", secondary: "#E8E8E8", accent: "#C8102E" },
    coverLayout: "minimal_text" as const,
    descriptors: ["cinematic", "dark atmosphere", "high contrast", "moody", "noir"],
    imageStyle: "Dark cinematic photography, deep shadows, high contrast black and white, mysterious and atmospheric, editorial style",
  },
  {
    id: "vibrant",
    label: "Яркий",
    hint: "энергия, цвет, движение",
    palette: { primary: "#FF2D55", secondary: "#1C1C1E", accent: "#FFD60A" },
    coverLayout: "full_bleed" as const,
    descriptors: ["vivid colors", "dynamic", "energetic", "bold", "saturated"],
    imageStyle: "Vibrant saturated photography, bold colors, dynamic composition, energetic and expressive, pop art influences",
  },
  {
    id: "muted",
    label: "Атмосферный",
    hint: "туман, пространство, воздух",
    palette: { primary: "#3A3A3C", secondary: "#F2F2F7", accent: "#30D158" },
    coverLayout: "centered_logo" as const,
    descriptors: ["soft", "atmospheric", "muted tones", "ethereal", "ambient"],
    imageStyle: "Soft muted photography, foggy landscapes, pastel tones, dreamy and ethereal, wide open spaces",
  },
  {
    id: "monochrome",
    label: "Минимализм",
    hint: "чисто, строго, типографика",
    palette: { primary: "#000000", secondary: "#FFFFFF", accent: "#6C6C70" },
    coverLayout: "typographic" as const,
    descriptors: ["minimal", "clean", "geometric", "monochrome", "typographic"],
    imageStyle: "Minimalist monochrome photography, clean lines, geometric shapes, stark contrasts, architectural precision",
  },
  {
    id: "light",
    label: "Светлый",
    hint: "день, тепло, простота",
    palette: { primary: "#F5F5F0", secondary: "#1C1C1E", accent: "#007AFF" },
    coverLayout: "centered_logo" as const,
    descriptors: ["bright", "airy", "warm light", "natural", "fresh"],
    imageStyle: "Bright airy photography, natural light, warm tones, fresh and clean aesthetic, lifestyle imagery",
  },
] as const;

type MoodId = typeof MOODS[number]["id"];

const PLATFORMS = [
  { id: "vk", label: "VK" },
  { id: "telegram", label: "Telegram" },
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube" },
  { id: "tiktok", label: "TikTok" },
  { id: "spotify", label: "Spotify" },
] as const;

export function BrandForm({ artistId, defaultName = "" }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const [artistName, setArtistName] = useState(defaultName);
  const [oneLiner, setOneLiner] = useState("");
  const [description, setDescription] = useState("");
  const [genreInput, setGenreInput] = useState("");
  const [selectedMood, setSelectedMood] = useState<MoodId | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["vk"]);
  const [language, setLanguage] = useState<"ru" | "en" | "ru_en_mixed">("ru");

  const steps = [
    {
      title: "Как тебя зовут?",
      hint: "Имя артиста и короткий слоган",
      valid: artistName.trim().length > 0 && oneLiner.trim().length > 0,
    },
    {
      title: "О чём твоя музыка?",
      hint: "Расскажи своими словами — это основа для AI",
      valid: description.trim().length >= 20,
    },
    {
      title: "Жанры и стиль",
      hint: "Через запятую: techno, dark ambient, experimental",
      valid: genreInput.trim().length > 0,
    },
    {
      title: "Выбери настроение",
      hint: "Определяет визуальный стиль всего контента",
      valid: selectedMood !== null,
    },
    {
      title: "Где ты есть?",
      hint: "Платформы и основной язык",
      valid: selectedPlatforms.length > 0,
    },
  ];

  function buildBrandData() {
    const mood = MOODS.find((m) => m.id === selectedMood)!;
    const genres = genreInput.split(",").map((s) => s.trim()).filter(Boolean);
    const keywords = [...genres, ...mood.descriptors.slice(0, 3)].slice(0, 10);
    const themes = genres.slice(0, 5).length >= 2 ? genres.slice(0, 5) : [...genres, "музыка"].slice(0, 5);

    return {
      v: 1,
      identity: {
        artistName,
        concept: {
          oneLiner,
          description,
          keywords,
        },
        logomark: null,
      },
      visual: {
        palette: { ...mood.palette, mood: mood.id as "dark" | "light" | "vibrant" | "muted" | "monochrome" },
        typography: null,
        imageStyle: {
          promptFragment: `${mood.imageStyle}. Artist style: ${description.slice(0, 200)}`,
          descriptors: mood.descriptors as unknown as string[],
          forbidden: [],
          references: [],
        },
        composition: {
          coverLayout: mood.coverLayout,
          socialAspectRatios: ["1:1", "9:16"] as ("1:1" | "9:16")[],
        },
      },
      verbal: {
        toneOfVoice: {
          descriptors: mood.descriptors.slice(0, 5) as unknown as string[],
          avoid: [],
        },
        exemplars: {
          bioShort: `${artistName} — ${oneLiner}`,
          bioLong: description,
          pressOneLiner: `${artistName}: ${oneLiner}`,
        },
        themes: themes.length >= 2 ? themes : [...themes, "творчество"],
        language: { primary: language, secondary: [] as ("ru" | "en")[] },
      },
      audience: {
        primary: {
          description: `Слушатели ${genres.join(", ")} музыки`,
          interests: genres.slice(0, 5).length >= 2 ? genres.slice(0, 5) : [...genres, "музыка"],
        },
        platforms: selectedPlatforms.map((p, i) => ({
          name: p as "telegram" | "vk" | "instagram" | "youtube" | "tiktok" | "spotify",
          priority: (i === 0 ? "primary" : "secondary") as "primary" | "secondary",
        })),
        positioning: {
          genre: genres.slice(0, 5).length > 0 ? genres.slice(0, 5) : ["music"],
          similarTo: [],
          differentBecause: description.slice(0, 499),
        },
      },
      source: { generatedBy: "user_manual" as const, aiJobIds: [] },
    };
  }

  async function handleSubmit() {
    setPending(true);
    setError("");

    const res = await fetch(`/api/v1/artists/${artistId}/brand`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: buildBrandData(), lockAndSetCurrent: true }),
    });

    if (res.ok) {
      router.push("/releases/new");
      router.refresh();
    } else {
      const data = await res.json() as { error: unknown };
      setError(typeof data.error === "string" ? data.error : "Ошибка сохранения");
      setPending(false);
    }
  }

  const current = steps[step]!;
  const isLast = step === steps.length - 1;

  return (
    <div className="flex flex-col gap-8">
      {/* Progress */}
      <div className="flex gap-1.5">
        {steps.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < step ? "bg-primary" : i === step ? "bg-primary/60" : "bg-muted",
            )}
          />
        ))}
      </div>

      {/* Step header */}
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          Шаг {step + 1} из {steps.length}
        </p>
        <h2 className="text-xl font-bold">{current.title}</h2>
        <p className="text-sm text-muted-foreground">{current.hint}</p>
      </div>

      {/* Step content */}
      <div className="flex flex-col gap-4">
        {step === 0 && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label>Имя артиста</Label>
              <Input
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                placeholder="IVANOV"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>В одном предложении — кто ты?</Label>
              <Input
                value={oneLiner}
                onChange={(e) => setOneLiner(e.target.value)}
                placeholder="Электронная музыка между тревогой и катарсисом"
                maxLength={140}
              />
              <p className="text-xs text-muted-foreground text-right">{oneLiner.length}/140</p>
            </div>
          </>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-1.5">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Расскажи о своей музыке, образе, идее. Откуда берётся звук, какие темы ты исследуешь, что хочешь донести слушателю..."
              rows={7}
              autoFocus
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">{description.length}/1000</p>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-1.5">
            <Label>Жанры</Label>
            <Input
              value={genreInput}
              onChange={(e) => setGenreInput(e.target.value)}
              placeholder="techno, dark ambient, industrial"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">Через запятую, любые слова — они станут ключевыми для AI</p>
          </div>
        )}

        {step === 3 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MOODS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMood(m.id)}
                className={cn(
                  "flex flex-col gap-3 rounded-xl border p-4 text-left transition-all hover:border-primary",
                  selectedMood === m.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border",
                )}
              >
                {/* Palette preview */}
                <div className="flex gap-1.5">
                  {Object.values(m.palette).filter(v => v.startsWith("#")).map((color) => (
                    <div
                      key={color}
                      className="h-5 w-5 rounded-full border border-white/20"
                      style={{ background: color }}
                    />
                  ))}
                </div>
                <div>
                  <p className="font-medium text-sm">{m.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{m.hint}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label>Платформы</Label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => {
                  const on = selectedPlatforms.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        setSelectedPlatforms(
                          on
                            ? selectedPlatforms.filter((x) => x !== p.id)
                            : [...selectedPlatforms, p.id],
                        )
                      }
                      className={cn(
                        "rounded-full border px-4 py-1.5 text-sm transition-colors",
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:bg-muted",
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Основной язык</Label>
              <div className="flex gap-2">
                {(["ru", "en", "ru_en_mixed"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLanguage(l)}
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-sm transition-colors",
                      language === l
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    {l === "ru" ? "Русский" : l === "en" ? "English" : "Оба"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={() => (step === 0 ? router.back() : setStep(step - 1))}
          disabled={pending}
        >
          {step === 0 ? "Отмена" : "← Назад"}
        </Button>

        {isLast ? (
          <Button onClick={() => void handleSubmit()} disabled={!current.valid || pending}>
            {pending ? "Сохраняем..." : "Готово →"}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => setStep(step + 1)}
            disabled={!current.valid}
          >
            Далее →
          </Button>
        )}
      </div>
    </div>
  );
}
