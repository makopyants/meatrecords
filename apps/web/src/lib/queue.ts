import { Queue } from "bullmq";
import { Redis as IORedis } from "ioredis";
import type { AiModule } from "@repo/shared";

export interface AiJobPayload {
  jobId: string;
  module: AiModule;
  releaseId?: string | null;
  artistId: string;
  input: unknown;
}

let connection: IORedis | null = null;
let queue: Queue<AiJobPayload> | null = null;

function getConnection() {
  if (!connection) {
    const url = process.env["REDIS_URL"] ?? "redis://127.0.0.1:6379";
    connection = new IORedis(url, { maxRetriesPerRequest: null, lazyConnect: true });
  }
  return connection;
}

export function getAiJobsQueue() {
  if (!queue) {
    queue = new Queue<AiJobPayload>("ai-jobs", { connection: getConnection() });
  }
  return queue;
}
