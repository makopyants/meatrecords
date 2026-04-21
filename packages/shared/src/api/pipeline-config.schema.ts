import { z } from "zod";

export const PipelineConfigSchema = z.object({
  modules: z.object({
    cover: z.boolean().default(true),
    social: z.boolean().default(true),
    teaser: z.boolean().default(true),
  }),
  coverOptions: z.object({ variants: z.number().min(1).max(4).default(2) }).optional(),
  socialOptions: z.object({ platforms: z.array(z.string()) }).optional(),
  teaserOptions: z
    .object({
      template: z.enum(["ritual", "pulse", "monolith"]),
      durationSec: z.union([z.literal(15), z.literal(30), z.literal(60)]),
    })
    .optional(),
});

export type PipelineConfig = z.infer<typeof PipelineConfigSchema>;
