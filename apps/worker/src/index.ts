import { Worker } from "bullmq";
import { connection, AI_JOBS_QUEUE, type AiJobPayload } from "./queues.js";

const BACKOFF_DELAYS = [5_000, 30_000, 120_000];

const worker = new Worker<AiJobPayload>(
  AI_JOBS_QUEUE,
  async (job) => {
    const { module, jobId, releaseId, artistId } = job.data;

    console.log(`[worker] starting job=${jobId} module=${module} release=${releaseId ?? "—"} artist=${artistId}`);

    await job.updateProgress({ stage: "starting", percent: 0 });

    // Module handlers are registered here as they're implemented
    switch (module) {
      case "BRAND":
      case "COVER":
      case "SOCIAL":
      case "TEASER":
        throw new Error(`Module ${module} not implemented yet`);
      default: {
        const _exhaustive: never = module;
        throw new Error(`Unknown module: ${String(_exhaustive)}`);
      }
    }
  },
  {
    connection,
    concurrency: 2,
    settings: {
      backoffStrategy: (attemptsMade) =>
        BACKOFF_DELAYS[attemptsMade - 1] ?? 120_000,
    },
  },
);

worker.on("completed", (job) => {
  console.log(`[worker] completed job=${job.id ?? "?"}`);
});

worker.on("failed", (job, err) => {
  console.error(`[worker] failed job=${job?.id ?? "?"} error=${err.message}`);
});

worker.on("error", (err) => {
  console.error("[worker] error", err);
});

console.log(`[worker] listening on queue="${AI_JOBS_QUEUE}"`);

process.on("SIGTERM", async () => {
  console.log("[worker] shutting down...");
  await worker.close();
  process.exit(0);
});
