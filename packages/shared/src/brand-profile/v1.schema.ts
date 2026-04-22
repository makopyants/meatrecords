import { z } from "zod";

const HexColorSchema = z.string().regex(/^#[0-9A-F]{6}$/i);

const FontSchema = z.object({
  family: z.string(),
  source: z.enum(["google_fonts", "adobe_fonts", "custom"]),
  url: z.string().url().optional(),
  usage: z.string(),
});

const IdentityBlockSchema = z.object({
  artistName: z.string().min(1).max(80),
  pronunciation: z.string().optional(),
  concept: z.object({
    oneLiner: z.string().max(140),
    description: z.string().max(1000),
    keywords: z.array(z.string()).min(3).max(10),
  }),
  logomark: z
    .object({
      prompt: z.string(),
      imageUrl: z.string().url(),
      backgroundVariants: z.array(z.enum(["light", "dark", "transparent"])),
    })
    .nullable(),
  logomarkVariants: z
    .array(
      z.object({
        prompt: z.string(),
        imageUrl: z.string().url(),
      }),
    )
    .optional(),
});

const VisualBlockSchema = z.object({
  palette: z.object({
    primary: HexColorSchema,
    secondary: HexColorSchema,
    accent: HexColorSchema,
    mood: z.enum(["dark", "light", "vibrant", "muted", "monochrome"]),
  }),
  typography: z
    .object({
      display: FontSchema,
      body: FontSchema,
    })
    .nullable(),
  imageStyle: z.object({
    promptFragment: z.string().min(50).max(500),
    descriptors: z.array(z.string()).min(3).max(15),
    forbidden: z.array(z.string()).default([]),
    references: z
      .array(
        z.object({
          url: z.string().url(),
          note: z.string().optional(),
        }),
      )
      .default([]),
  }),
  composition: z.object({
    coverLayout: z.enum(["centered_logo", "full_bleed", "minimal_text", "typographic"]),
    socialAspectRatios: z
      .array(z.enum(["1:1", "9:16", "16:9", "4:5"]))
      .default(["1:1", "9:16"]),
  }),
});

const VerbalBlockSchema = z.object({
  toneOfVoice: z.object({
    descriptors: z.array(z.string()).min(3).max(8),
    avoid: z.array(z.string()).default([]),
  }),
  exemplars: z.object({
    bioShort: z.string().max(280),
    bioLong: z.string().max(2000),
    pressOneLiner: z.string().max(140),
  }),
  themes: z.array(z.string()).min(2).max(7),
  language: z.object({
    primary: z.enum(["ru", "en", "ru_en_mixed"]),
    secondary: z.array(z.enum(["ru", "en"])).default([]),
  }),
});

const AudienceBlockSchema = z.object({
  primary: z.object({
    description: z.string().max(500),
    ageRange: z.tuple([z.number(), z.number()]).optional(),
    interests: z.array(z.string()).min(2).max(10),
  }),
  platforms: z
    .array(
      z.object({
        name: z.enum(["telegram", "vk", "instagram", "youtube", "tiktok", "spotify"]),
        priority: z.enum(["primary", "secondary"]),
      }),
    )
    .min(1),
  positioning: z.object({
    genre: z.array(z.string()).min(1).max(5),
    similarTo: z.array(z.string()).default([]),
    differentBecause: z.string().max(500),
  }),
});

export const BrandProfileV1Schema = z.object({
  v: z.literal(1),
  identity: IdentityBlockSchema,
  visual: VisualBlockSchema,
  verbal: VerbalBlockSchema,
  audience: AudienceBlockSchema,
  source: z.object({
    generatedBy: z.enum(["ai_full", "ai_assisted", "user_manual"]),
    aiJobIds: z.array(z.string()).default([]),
  }),
});

export type BrandProfileV1 = z.infer<typeof BrandProfileV1Schema>;
export type IdentityBlock = z.infer<typeof IdentityBlockSchema>;
export type VisualBlock = z.infer<typeof VisualBlockSchema>;
export type VerbalBlock = z.infer<typeof VerbalBlockSchema>;
export type AudienceBlock = z.infer<typeof AudienceBlockSchema>;
