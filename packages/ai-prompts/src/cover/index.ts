import type { CoverInput } from "@repo/shared";

const LAYOUT_HINT: Record<string, string> = {
  minimal_text: "minimal composition, large negative space, single focal element",
  full_bleed: "full-bleed composition, edge-to-edge imagery, bold and immersive",
  centered_logo: "centered subject, symmetrical composition, strong focal point",
  typographic: "graphic design aesthetic, strong geometric shapes, pure visual abstraction",
};

const MOOD_STYLE: Record<string, string> = {
  dark: "vivid",
  vibrant: "vivid",
  muted: "natural",
  monochrome: "natural",
  light: "natural",
};

export function buildCoverPrompt(input: CoverInput): { prompt: string; dalleStyle: "vivid" | "natural" } {
  const { brandProfile, release } = input;
  const { visual } = brandProfile;
  const { imageStyle, palette, composition } = visual;

  const layout = LAYOUT_HINT[composition.coverLayout] ?? "balanced composition";
  const descriptors = imageStyle.descriptors.slice(0, 5).join(", ");
  const forbidden = imageStyle.forbidden.length > 0
    ? `Avoid: ${imageStyle.forbidden.join(", ")}.`
    : "";
  const moodExtra = release.mood ? ` The mood of this track is: ${release.mood}.` : "";
  const lyricsExtra = release.lyricsExcerpt
    ? ` Lyrical theme: "${release.lyricsExcerpt.slice(0, 100)}".`
    : "";

  const prompt = [
    `Album cover artwork for the track "${release.title}".`,
    ``,
    `Visual style: ${imageStyle.promptFragment}.`,
    `Layout: ${layout}.`,
    `Color palette: dominant ${palette.primary}, accent ${palette.accent}.`,
    `Aesthetic descriptors: ${descriptors}.`,
    moodExtra,
    lyricsExtra,
    ``,
    `Requirements: square format, professional album artwork quality, no text, no watermarks, no UI elements, no people unless central to the concept, photorealistic or high-end digital art.`,
    forbidden,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const dalleStyle = (MOOD_STYLE[palette.mood] ?? "vivid") as "vivid" | "natural";

  return { prompt, dalleStyle };
}
