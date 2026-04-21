"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

interface Props { artistId: string }

const MOODS = ["dark", "light", "vibrant", "muted", "monochrome"] as const;
const LAYOUTS = ["centered_logo", "full_bleed", "minimal_text", "typographic"] as const;
const PLATFORMS = ["telegram", "vk", "instagram", "youtube", "tiktok", "spotify"] as const;
const LANGUAGES = ["ru", "en", "ru_en_mixed"] as const;

function TagInput({
  label, value, onChange, placeholder, hint,
}: {
  label: string; value: string[]; onChange: (v: string[]) => void;
  placeholder?: string; hint?: string;
}) {
  const [input, setInput] = useState("");
  function add() {
    const v = input.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setInput("");
  }
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder ?? "Введи и нажми Enter"} />
        <Button type="button" variant="outline" size="sm" onClick={add}>+</Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {value.map((t) => (
            <span key={t} className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs">
              {t}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== t))}
                className="text-muted-foreground hover:text-foreground">×</button>
            </span>
          ))}
        </div>
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function BrandForm({ artistId }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  // Identity
  const [artistName, setArtistName] = useState("");
  const [oneLiner, setOneLiner] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);

  // Visual
  const [primary, setPrimary] = useState("#1A1A1A");
  const [secondary, setSecondary] = useState("#F5F5F5");
  const [accent, setAccent] = useState("#FF4500");
  const [mood, setMood] = useState<typeof MOODS[number]>("dark");
  const [promptFragment, setPromptFragment] = useState("");
  const [descriptors, setDescriptors] = useState<string[]>([]);
  const [forbidden, setForbidden] = useState<string[]>([]);
  const [coverLayout, setCoverLayout] = useState<typeof LAYOUTS[number]>("centered_logo");

  // Verbal
  const [toneDescriptors, setToneDescriptors] = useState<string[]>([]);
  const [bioShort, setBioShort] = useState("");
  const [bioLong, setBioLong] = useState("");
  const [pressOneLiner, setPressOneLiner] = useState("");
  const [themes, setThemes] = useState<string[]>([]);
  const [language, setLanguage] = useState<typeof LANGUAGES[number]>("ru");

  // Audience
  const [audienceDesc, setAudienceDesc] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<{ name: string; priority: "primary" | "secondary" }[]>([]);
  const [genre, setGenre] = useState<string[]>([]);
  const [differentBecause, setDifferentBecause] = useState("");

  function togglePlatform(name: string) {
    const existing = selectedPlatforms.find((p) => p.name === name);
    if (existing) {
      setSelectedPlatforms(selectedPlatforms.filter((p) => p.name !== name));
    } else {
      setSelectedPlatforms([...selectedPlatforms, { name, priority: "primary" }]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");

    const brandData = {
      v: 1,
      identity: {
        artistName,
        concept: { oneLiner, description, keywords },
        logomark: null,
      },
      visual: {
        palette: { primary, secondary, accent, mood },
        typography: null,
        imageStyle: { promptFragment, descriptors, forbidden, references: [] },
        composition: { coverLayout, socialAspectRatios: ["1:1", "9:16"] },
      },
      verbal: {
        toneOfVoice: { descriptors: toneDescriptors, avoid: [] },
        exemplars: { bioShort, bioLong, pressOneLiner },
        themes,
        language: { primary: language, secondary: [] },
      },
      audience: {
        primary: { description: audienceDesc, interests },
        platforms: selectedPlatforms.length > 0 ? selectedPlatforms : [{ name: "vk", priority: "primary" }],
        positioning: { genre, similarTo: [], differentBecause },
      },
      source: { generatedBy: "user_manual", aiJobIds: [] },
    };

    const res = await fetch(`/api/v1/artists/${artistId}/brand`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: brandData, lockAndSetCurrent: true }),
    });

    if (res.ok) {
      router.push("/releases/new");
      router.refresh();
    } else {
      const data = await res.json() as { error: unknown };
      setError(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
    }
    setPending(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">

      {/* Identity */}
      <Card>
        <CardHeader><CardTitle className="text-base">Идентичность</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Имя артиста *</Label>
            <Input value={artistName} onChange={(e) => setArtistName(e.target.value)} required placeholder="Как пишется на обложках" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>One-liner (до 140 символов) *</Label>
            <Input value={oneLiner} onChange={(e) => setOneLiner(e.target.value)} required maxLength={140} placeholder="Электронная музыка для ночных городов" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Описание концепции (до 1000 символов) *</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} required maxLength={1000} rows={3} placeholder="Что стоит за образом артиста, откуда он, о чём его музыка" />
          </div>
          <TagInput label="Ключевые слова (3–10) *" value={keywords} onChange={setKeywords} placeholder="Например: меланхолия" hint="Минимум 3 слова" />
        </CardContent>
      </Card>

      {/* Visual */}
      <Card>
        <CardHeader><CardTitle className="text-base">Визуальный стиль</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            {([["primary", primary, setPrimary, "Основной"], ["secondary", secondary, setSecondary, "Второстепенный"], ["accent", accent, setAccent, "Акцент"]] as const).map(([, val, setter, lbl]) => (
              <div key={lbl} className="flex flex-col gap-1.5">
                <Label>{lbl}</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={val} onChange={(e) => (setter as (v: string) => void)(e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                  <Input value={val} onChange={(e) => (setter as (v: string) => void)(e.target.value)} className="font-mono text-xs" maxLength={7} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Настроение палитры</Label>
            <div className="flex gap-2 flex-wrap">
              {MOODS.map((m) => (
                <button key={m} type="button" onClick={() => setMood(m)}
                  className={`rounded-full px-3 py-1 text-sm border transition-colors ${mood === m ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Описание визуального стиля для AI (50–500 символов) *</Label>
            <Textarea value={promptFragment} onChange={(e) => setPromptFragment(e.target.value)} required minLength={50} maxLength={500} rows={3} placeholder="Cinematic dark photography, neon lights reflecting on wet asphalt, high contrast black and white..." />
          </div>
          <TagInput label="Визуальные дескрипторы (3–15) *" value={descriptors} onChange={setDescriptors} placeholder="Например: cinematic" hint="Минимум 3" />
          <TagInput label="Запрещённые элементы" value={forbidden} onChange={setForbidden} placeholder="Например: cartoons" />
          <div className="flex flex-col gap-1.5">
            <Label>Макет обложки</Label>
            <div className="flex gap-2 flex-wrap">
              {LAYOUTS.map((l) => (
                <button key={l} type="button" onClick={() => setCoverLayout(l)}
                  className={`rounded-full px-3 py-1 text-sm border transition-colors ${coverLayout === l ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
                  {l.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verbal */}
      <Card>
        <CardHeader><CardTitle className="text-base">Вербальный стиль</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <TagInput label="Тон голоса (3–8 дескрипторов) *" value={toneDescriptors} onChange={setToneDescriptors} placeholder="Например: меланхоличный" hint="Минимум 3" />
          <div className="flex flex-col gap-1.5">
            <Label>Короткое био (до 280 символов) *</Label>
            <Textarea value={bioShort} onChange={(e) => setBioShort(e.target.value)} required maxLength={280} rows={2} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Длинное био (до 2000 символов) *</Label>
            <Textarea value={bioLong} onChange={(e) => setBioLong(e.target.value)} required maxLength={2000} rows={5} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Пресс-строка (до 140 символов) *</Label>
            <Input value={pressOneLiner} onChange={(e) => setPressOneLiner(e.target.value)} required maxLength={140} placeholder="Для пресс-релизов и каталогов" />
          </div>
          <TagInput label="Темы творчества (2–7) *" value={themes} onChange={setThemes} placeholder="Например: одиночество" hint="Минимум 2" />
          <div className="flex flex-col gap-1.5">
            <Label>Основной язык</Label>
            <div className="flex gap-2">
              {LANGUAGES.map((l) => (
                <button key={l} type="button" onClick={() => setLanguage(l)}
                  className={`rounded-full px-3 py-1 text-sm border transition-colors ${language === l ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audience */}
      <Card>
        <CardHeader><CardTitle className="text-base">Аудитория</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Описание основной аудитории *</Label>
            <Textarea value={audienceDesc} onChange={(e) => setAudienceDesc(e.target.value)} required maxLength={500} rows={2} placeholder="Молодые люди 18–28, интересующиеся электронной музыкой..." />
          </div>
          <TagInput label="Интересы аудитории (2–10) *" value={interests} onChange={setInterests} placeholder="Например: nightlife" hint="Минимум 2" />
          <div className="flex flex-col gap-1.5">
            <Label>Платформы (выбери хотя бы одну) *</Label>
            <div className="flex gap-2 flex-wrap">
              {PLATFORMS.map((p) => {
                const selected = selectedPlatforms.find((x) => x.name === p);
                return (
                  <button key={p} type="button" onClick={() => togglePlatform(p)}
                    className={`rounded-full px-3 py-1 text-sm border transition-colors ${selected ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
          <TagInput label="Жанры (1–5) *" value={genre} onChange={setGenre} placeholder="Например: techno" hint="Минимум 1" />
          <div className="flex flex-col gap-1.5">
            <Label>Чем отличается от других (до 500 символов) *</Label>
            <Textarea value={differentBecause} onChange={(e) => setDifferentBecause(e.target.value)} required maxLength={500} rows={2} />
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex gap-2 justify-end pb-8">
        <Button type="button" variant="outline" onClick={() => router.back()}>Отмена</Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Сохраняем..." : "Сохранить и заблокировать"}
        </Button>
      </div>
    </form>
  );
}
