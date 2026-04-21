import { z } from "zod";
import { PipelineConfigSchema } from "./pipeline-config.schema.js";

export const CreateReleaseSchema = z.object({
  artistId: z.string().min(1),
  title: z.string().min(1).max(200),
  pipelineConfig: PipelineConfigSchema.optional(),
});

export const TransitionReleaseSchema = z.object({
  event: z.enum([
    "submit_for_generation",
    "submit_skip_ai",
    "all_jobs_finished",
    "cancel_generation",
    "submit_to_moderation",
    "regenerate",
    "back_to_edit",
    "approve",
    "reject",
    "send_back",
    "start_distribution",
    "mark_live",
    "revise",
  ]),
  reason: z.string().optional(),
});

export const ModerateReleaseSchema = z.object({
  action: z.enum(["approve", "reject", "send_back"]),
  reason: z.string().optional(),
});

export type CreateRelease = z.infer<typeof CreateReleaseSchema>;
export type TransitionRelease = z.infer<typeof TransitionReleaseSchema>;
export type ModerateRelease = z.infer<typeof ModerateReleaseSchema>;
