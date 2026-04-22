import OpenAI from "openai";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { buildCoverPrompt } from "@repo/ai-prompts";
import { BrandProfileV1Schema } from "@repo/shared";
import type { CoverInput } from "@repo/shared";

const VARIANTS = 3;

function getOpenAI() {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");
  return new OpenAI({ apiKey });
}

function getS3(): S3Client | null {
  const accountId = process.env["R2_ACCOUNT_ID"];
  const accessKeyId = process.env["R2_ACCESS_KEY_ID"];
  const secretAccessKey = process.env["R2_SECRET_ACCESS_KEY"];
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

async function uploadToR2(s3: S3Client, key: string, data: Uint8Array): Promise<string> {
  const bucket = process.env["R2_BUCKET_NAME"] ?? "meatrecords";
  const publicUrl = process.env["R2_PUBLIC_URL"] ?? "";
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: data,
    ContentType: "image/png",
  }));
  return `${publicUrl}/${key}`;
}

async function downloadImage(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

export interface CoverJobInput {
  releaseId: string;
  artistId: string;
  brandProfileData: unknown;
  release: { title: string; mood?: string; lyricsExcerpt?: string };
}

export interface CoverResult {
  covers: Array<{ url: string; prompt: string; variation: string }>;
}

export async function runCoverModule(
  raw: unknown,
  onProgress: (pct: number) => void,
): Promise<CoverResult> {
  const jobInput = raw as CoverJobInput;

  // Parse brand profile
  const brandProfile = BrandProfileV1Schema.parse(jobInput.brandProfileData);

  const input: CoverInput = {
    brandProfile,
    release: {
      title: jobInput.release.title,
      ...(jobInput.release.mood !== undefined ? { mood: jobInput.release.mood } : {}),
      ...(jobInput.release.lyricsExcerpt !== undefined ? { lyricsExcerpt: jobInput.release.lyricsExcerpt } : {}),
    },
    variants: VARIANTS,
  };

  const { prompt, dalleStyle } = buildCoverPrompt(input);
  console.log(`[cover] prompt: ${prompt.slice(0, 120)}…`);

  // Free generation via Pollinations.ai (no API key required)
  if (!process.env["OPENAI_API_KEY"] || process.env["COVER_MOCK"] === "true") {
    console.log(`[cover] using Pollinations.ai (free, no key required)`);
    const covers: CoverResult["covers"] = [];

    const baseSeed = Math.floor(Math.random() * 90000) + 10000;
    for (let i = 0; i < VARIANTS; i++) {
      const seed = baseSeed + i * 337;
      const encodedPrompt = encodeURIComponent(prompt);
      const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${String(seed)}&model=flux&nologo=true&enhance=true`;

      // Eagerly fetch to confirm image is ready (Pollinations generates on request)
      console.log(`[cover] generating variant ${i + 1}/${VARIANTS} via Pollinations…`);
      const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
      if (!res.ok) throw new Error(`Pollinations returned ${String(res.status)}`);

      if (i > 0) await new Promise((r) => setTimeout(r, 3000));

      let finalUrl = url;

      const s3 = getS3();
      if (s3) {
        const data = new Uint8Array(await res.arrayBuffer());
        const key = `releases/${jobInput.releaseId}/cover/v${i + 1}-${String(Date.now())}.png`;
        finalUrl = await uploadToR2(s3, key, data);
        console.log(`[cover] uploaded to R2: ${key}`);
      }

      covers.push({ url: finalUrl, prompt, variation: `v${i + 1}` });
      onProgress(20 + Math.round((i + 1) / VARIANTS * 60));
    }

    return { covers };
  }

  const openai = getOpenAI();
  const s3 = getS3();
  const covers: CoverResult["covers"] = [];

  for (let i = 0; i < VARIANTS; i++) {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "hd",
      style: dalleStyle,
    });

    const item = response.data?.[0];
    const imageUrl = item?.url;
    const revisedPrompt = item?.revised_prompt ?? prompt;
    if (!imageUrl) throw new Error("OpenAI returned no image URL");

    let finalUrl: string;

    if (s3) {
      const key = `releases/${jobInput.releaseId}/cover/v${i + 1}-${String(Date.now())}.png`;
      const imageData = await downloadImage(imageUrl);
      finalUrl = await uploadToR2(s3, key, imageData);
      console.log(`[cover] uploaded to R2: ${key}`);
    } else {
      finalUrl = imageUrl;
      console.log(`[cover] dev mode — using OpenAI URL directly`);
    }

    covers.push({ url: finalUrl, prompt: revisedPrompt, variation: `v${i + 1}` });
    onProgress(40 + Math.round((i + 1) / VARIANTS * 40));
  }

  return { covers };
}
