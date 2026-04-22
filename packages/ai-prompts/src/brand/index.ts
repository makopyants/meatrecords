import type { BrandProfileV1 } from "@repo/shared";

export function buildLogoPrompt(brand: BrandProfileV1): string {
  const { identity, visual, audience } = brand;
  const genres = audience.positioning.genre.slice(0, 3).join(", ");
  const descriptors = visual.imageStyle.descriptors.slice(0, 4).join(", ");
  const keywords = identity.concept.keywords.slice(0, 3).join(", ");

  const moodMap: Record<string, string> = {
    dark: "dark moody minimal",
    vibrant: "bold colorful dynamic",
    muted: "soft atmospheric ethereal",
    monochrome: "clean geometric monochrome",
    light: "bright airy fresh",
  };
  const moodDesc = moodMap[visual.palette.mood] ?? visual.palette.mood;

  return (
    `Abstract minimalist music artist logo icon for "${identity.artistName}". ` +
    `Genre: ${genres}. Style: ${moodDesc}, ${descriptors}. Keywords: ${keywords}. ` +
    `Primary color ${visual.palette.primary}, accent ${visual.palette.accent}. ` +
    `Simple iconic symbol — no text, no letters, no words. ` +
    `Flat vector-style, works on both dark and light backgrounds, ` +
    `professional music industry branding, single cohesive mark.`
  );
}
