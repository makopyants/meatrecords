import type { SocialInput } from "@repo/shared";

const PLATFORM_RULES: Record<string, string> = {
  vk: "VK post: 3-5 sentences, can include a story or context, conversational but on-brand. No hashtags inline — put them at the end.",
  telegram: "Telegram post: 2-4 sentences, direct and punchy, can use 1-2 emoji if they fit the tone. No hashtag spam.",
  instagram: "Instagram caption: 3-5 lines max, evocative and visual, 10-20 relevant hashtags at the end.",
  youtube: "YouTube description: 2-3 sentences for the first paragraph (shown before 'more'), then a blank line and 5-10 hashtags.",
  tiktok: "TikTok caption: 1-2 sentences max, punchy, trending language if it fits the artist's style. 5-10 hashtags.",
};

const LANGUAGE_INSTRUCTION: Record<string, string> = {
  ru: "Write all post text in Russian.",
  en: "Write all post text in English.",
  ru_en_mixed: "Write post text primarily in Russian, occasional English phrases allowed if they fit the brand.",
};

export function buildSocialPrompt(input: SocialInput): { system: string; user: string } {
  const { brandProfile, release, platforms } = input;
  const { identity, verbal, audience } = brandProfile;

  const lang = LANGUAGE_INSTRUCTION[verbal.language.primary] ?? LANGUAGE_INSTRUCTION["ru"]!;
  const genres = audience.positioning.genre.join(", ");
  const tone = verbal.toneOfVoice.descriptors.join(", ");
  const avoid = verbal.toneOfVoice.avoid.length > 0
    ? `Avoid: ${verbal.toneOfVoice.avoid.join(", ")}.`
    : "";
  const themes = verbal.themes.join(", ");
  const keywords = identity.concept.keywords.join(", ");

  const platformInstructions = platforms
    .map((p) => `- ${p}: ${PLATFORM_RULES[p] ?? "Short post, on-brand tone."}`)
    .join("\n");

  const system = `You are a music social media copywriter. Write platform-specific promotional posts for a new music release.

${lang}

Artist: ${identity.artistName}
Genre: ${genres}
Concept: ${identity.concept.oneLiner}
Description: ${identity.concept.description}
Tone of voice: ${tone}. ${avoid}
Recurring themes: ${themes}
Brand keywords: ${keywords}

Platform instructions:
${platformInstructions}

Respond with valid JSON only, no markdown. Schema:
{
  "posts": [
    {
      "platform": "<platform name>",
      "text": "<post body>",
      "hashtags": ["<tag without #>"]
    }
  ]
}`;

  const user = `New release: "${release.title}"
Generate one post per platform: ${platforms.join(", ")}.`;

  return { system, user };
}
