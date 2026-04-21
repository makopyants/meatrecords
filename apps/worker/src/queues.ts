import { Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";
import type { AiModule } from "@repo/shared";

const REDIS_URL = process.env["REDIS_URL"] ?? "redis://localhost:6379";

export const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const AI_JOBS_QUEUE = "ai-jobs";

export interface AiJobPayload {
  jobId: string;
  module: AiModule;
  releaseId?: string;
  artistId: string;
  input: unknown;
}

export const aiJobsQueue = new Queue<AiJobPayload>(AI_JOBS_QUEUE, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "custom",
    },
  },
});

export const aiJobsQueueEvents = new QueueEvents(AI_JOBS_QUEUE, { connection });
