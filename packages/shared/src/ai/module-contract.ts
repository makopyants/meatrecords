import type { z } from "zod";
import type { BrandProfileV1 } from "../brand-profile/v1.schema.js";

export type AiModule = "BRAND" | "COVER" | "SOCIAL" | "TEASER";

export interface StorageClient {
  upload(key: string, data: Uint8Array, mimeType: string): Promise<string>;
  getSignedUrl(key: string, expiresInSec: number): Promise<string>;
}

export interface CostLogEntry {
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  imageCount?: number;
  estimatedUsd: number;
}

export interface CostEstimate {
  minUsd: number;
  maxUsd: number;
  notes?: string;
}

export interface CostSummary {
  totalUsd: number;
  entries: CostLogEntry[];
}

export interface Artifact {
  key: string;
  url: string;
  mimeType: string;
  sizeBytes?: number;
}

export type ErrorKind =
  | "invalid_input"
  | "provider_unavailable"
  | "provider_rate_limit"
  | "provider_content_policy"
  | "internal_timeout"
  | "user_cancelled"
  | "unknown";

export class ModuleError extends Error {
  constructor(
    public readonly kind: ErrorKind,
    public readonly retryable: boolean,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ModuleError";
  }
}

export interface ModuleContext {
  jobId: string;
  releaseId?: string;
  artistId: string;
  reportProgress(stage: string, percent: number): Promise<void>;
  logCost(entry: CostLogEntry): void;
  storage: StorageClient;
  abortSignal: { aborted: boolean; addEventListener(type: string, listener: () => void): void };
}

export interface ModuleResult<TOutput> {
  status: "success" | "partial" | "failed";
  output?: TOutput;
  error?: ModuleError;
  artifacts: Artifact[];
  costSummary: CostSummary;
}

export interface AiModuleHandler<TInput, TOutput> {
  readonly name: AiModule;
  readonly inputSchema: z.ZodType<TInput>;
  readonly outputSchema: z.ZodType<TOutput>;
  execute(input: TInput, ctx: ModuleContext): Promise<ModuleResult<TOutput>>;
  estimateCost(input: TInput): CostEstimate;
}

// ── Module I/O types ──────────────────────────────────────────────────────────

export type BrandInput = {
  brief: { description: string; genre: string[]; references?: string[] };
  inspirationImages?: string[];
};
export type BrandOutput = {
  brandProfile: BrandProfileV1;
  alternatives: { logomarkPrompts: string[] };
};

export type CoverInput = {
  brandProfile: BrandProfileV1;
  release: { title: string; mood?: string; lyricsExcerpt?: string };
  variants: number;
};
export type CoverOutput = {
  covers: Array<{ url: string; prompt: string; variation: string }>;
};

export type SocialInput = {
  brandProfile: BrandProfileV1;
  release: { title: string; releaseDate: Date; coverUrl: string };
  platforms: Array<"telegram" | "vk" | "instagram">;
};
export type SocialOutput = {
  posts: Array<{
    platform: string;
    text: string;
    imageUrl?: string;
    hashtags: string[];
  }>;
};

export type TeaserInput = {
  brandProfile: BrandProfileV1;
  release: { title: string; coverUrl: string };
  audioExcerpt: { url: string; durationSec: number };
  template: "ritual" | "pulse" | "monolith";
  durationSec: 15 | 30 | 60;
};
export type TeaserOutput = {
  videoUrl: string;
  thumbnailUrl: string;
  durationSec: number;
};
