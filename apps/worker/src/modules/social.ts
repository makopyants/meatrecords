import OpenAI from "openai";
import { buildSocialPrompt } from "@repo/ai-prompts";
import { BrandProfileV1Schema } from "@repo/shared";
import type { SocialInput, SocialOutput } from "@repo/shared";

const SUPPORTED_PLATFORMS = ["vk", "telegram", "instagram", "youtube", "tiktok"] as const;
type Platform = (typeof SUPPORTED_PLATFORMS)[number];

export interface SocialJobInput {
  releaseId: string;
  artistId: string;
  brandProfileData: unknown;
  release: { title: string };
}

function getOpenAI() {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");
  return new OpenAI({ apiKey });
}

function derivePlatforms(brandProfileData: unknown): Platform[] {
  const parsed = BrandProfileV1Schema.safeParse(brandProfileData);
  if (!parsed.success) return ["vk", "telegram"];
  const platforms = parsed.data.audience.platforms
    .map((p) => p.name)
    .filter((n): n is Platform =>
      (SUPPORTED_PLATFORMS as readonly string[]).includes(n),
    );
  return platforms.length > 0 ? platforms : ["vk", "telegram"];
}

function stubPosts(platforms: Platform[], title: string): SocialOutput {
  return {
    posts: platforms.map((platform) => ({
      platform,
      text: `Новый релиз — «${title}». Скоро.`,
      hashtags: ["newrelease", "music"],
    })),
  };
}

export async function runSocialModule(raw: unknown): Promise<SocialOutput> {
  const jobInput = raw as SocialJobInput;
  const brandProfile = BrandProfileV1Schema.parse(jobInput.brandProfileData);
  const platforms = derivePlatforms(jobInput.brandProfileData);

  if (!process.env["OPENAI_API_KEY"]) {
    console.log("[social] no OPENAI_API_KEY — returning stub posts");
    return stubPosts(platforms, jobInput.release.title);
  }

  const input: SocialInput = {
    brandProfile,
    release: {
      title: jobInput.release.title,
      releaseDate: new Date(),
      coverUrl: "",
    },
    platforms,
  };

  const { system, user } = buildSocialPrompt(input);

  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.8,
    max_tokens: 2000,
  });

  const raw_text = response.choices[0]?.message.content ?? "{}";
  const parsed = JSON.parse(raw_text) as { posts?: SocialOutput["posts"] };

  if (!Array.isArray(parsed.posts) || parsed.posts.length === 0) {
    console.warn("[social] unexpected OpenAI response shape, falling back to stub");
    return stubPosts(platforms, jobInput.release.title);
  }

  console.log(`[social] generated ${String(parsed.posts.length)} posts via gpt-4o-mini`);
  return { posts: parsed.posts };
}
