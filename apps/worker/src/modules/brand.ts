import OpenAI from "openai";
import { buildLogoPrompt } from "@repo/ai-prompts";
import { BrandProfileV1Schema } from "@repo/shared";

export interface BrandJobInput {
  brandProfileId: string;
  artistId: string;
  brandProfileData: unknown;
}

export interface LogoVariant {
  prompt: string;
  imageUrl: string;
}

export interface BrandResult {
  logomarkVariants: LogoVariant[];
}

function getOpenAI(): OpenAI | null {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

async function buildVariantPrompts(brand: ReturnType<typeof BrandProfileV1Schema.parse>): Promise<string[]> {
  const openai = getOpenAI();
  const genres = brand.audience.positioning.genre;
  const artistName = brand.identity.artistName;
  const moodDesc = brand.visual.imageStyle.descriptors.slice(0, 4).join(", ");
  const primaryColor = brand.visual.palette.primary;
  const accentColor = brand.visual.palette.accent;

  if (!openai) {
    // Fallback: generate 3 variations of the base prompt with different composition suffixes
    const base = buildLogoPrompt(brand);
    const suffixes = [
      "Abstract geometric symbol, sharp edges, angular composition.",
      "Organic flowing form, rounded shapes, fluid composition.",
      "Bold iconic mark, strong silhouette, striking negative space.",
    ];
    return suffixes.map((s) => `${base} ${s}`);
  }

  const system = `You are a music branding expert creating Pollinations.ai logo prompts.
Given artist genres, determine the most visually cohesive aesthetic — if genres conflict, prioritize those with the most stylistic overlap and briefly explain the choice.
Generate exactly 3 logo prompt variations. All 3 must be within the same genre-appropriate visual style, but differ in compositional approach (e.g., geometric/angular vs organic/flowing vs bold symbolic).

Requirements for each prompt:
- Abstract iconic symbol — no text, no letters, no words
- Flat vector style, single cohesive mark
- Works on dark and light backgrounds
- Professional music branding quality
- Include the primary color and accent color
- 60–120 words each

Return JSON: { "styleRationale": "...", "variants": [{ "prompt": "..." }, { "prompt": "..." }, { "prompt": "..." }] }`;

  const userMsg = `Artist: "${artistName}"
Genres: ${genres.join(", ")}
Mood/descriptors: ${moodDesc}
Primary color: ${primaryColor}
Accent color: ${accentColor}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
      temperature: 0.7,
      max_tokens: 1200,
    });

    const raw = response.choices[0]?.message.content ?? "{}";
    const parsed = JSON.parse(raw) as { variants?: Array<{ prompt: string }> };

    if (Array.isArray(parsed.variants) && parsed.variants.length === 3) {
      const prompts = parsed.variants.map((v) => v.prompt).filter(Boolean);
      if (prompts.length === 3) {
        console.log(`[brand] GPT generated 3 variant prompts`);
        return prompts;
      }
    }
  } catch (e) {
    console.warn("[brand] GPT prompt generation failed, using fallback:", e);
  }

  // Fallback
  const base = buildLogoPrompt(brand);
  const suffixes = [
    "Abstract geometric symbol, sharp edges, angular composition.",
    "Organic flowing form, rounded shapes, fluid composition.",
    "Bold iconic mark, strong silhouette, striking negative space.",
  ];
  return suffixes.map((s) => `${base} ${s}`);
}

function generateImage(prompt: string, seed: number): string {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&seed=${String(seed)}&model=flux&nologo=true`;
}


export async function runBrandModule(
  raw: unknown,
  onProgress: (pct: number) => void,
): Promise<BrandResult> {
  const jobInput = raw as BrandJobInput;
  const brand = BrandProfileV1Schema.parse(jobInput.brandProfileData);

  console.log(`[brand] building 3 variant prompts for "${brand.identity.artistName}"…`);
  onProgress(10);

  const prompts = await buildVariantPrompts(brand);
  onProgress(25);

  const variants: LogoVariant[] = [];

  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i]!;
    const seed = Math.floor(Math.random() * 90000) + 10000;
    const imageUrl = generateImage(prompt, seed);
    variants.push({ prompt, imageUrl });
    onProgress(25 + (i + 1) * 20);
  }

  console.log(`[brand] all 3 variants generated`);
  return { logomarkVariants: variants };
}
