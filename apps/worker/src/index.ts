import { Worker } from "bullmq";
import { connection, AI_JOBS_QUEUE, type AiJobPayload } from "./queues.js";
import { prisma } from "./lib/prisma.js";

const BACKOFF_DELAYS = [5_000, 30_000, 120_000];

async function processModule(module: AiJobPayload["module"], input: unknown, releaseId: string) {
  // Mock implementations — replace with real AI calls per module
  switch (module) {
    case "COVER":
      return {
        generatedContent: {
          module: "COVER" as const,
          payload: {
            covers: [
              {
                url: "https://placehold.co/3000x3000/0A0A0A/E8E8E8?text=COVER",
                prompt: "Mock cover generated from brand profile",
                variation: "v1",
              },
            ],
          },
        },
      };

    case "SOCIAL":
      return {
        generatedContent: {
          module: "SOCIAL" as const,
          payload: {
            posts: [
              {
                platform: "vk",
                text: "New release is coming. Stay tuned.",
                hashtags: ["music", "newrelease"],
              },
              {
                platform: "telegram",
                text: "New release is coming. Stay tuned.",
                hashtags: ["music", "newrelease"],
              },
            ],
          },
        },
      };

    case "TEASER":
      return {
        generatedContent: {
          module: "TEASER" as const,
          payload: {
            videoUrl: "https://placehold.co/teaser.mp4",
            thumbnailUrl: "https://placehold.co/1920x1080/0A0A0A/E8E8E8?text=TEASER",
            durationSec: 30,
          },
        },
      };

    case "BRAND":
      return {
        generatedContent: {
          module: "BRAND" as const,
          payload: { message: "Brand module processed" },
        },
      };

    default: {
      const _exhaustive: never = module;
      throw new Error(`Unknown module: ${String(_exhaustive)}`);
    }
  }
}

const worker = new Worker<AiJobPayload>(
  AI_JOBS_QUEUE,
  async (job) => {
    const { module, jobId, releaseId, artistId, input } = job.data;

    console.log(`[worker] starting job=${jobId} module=${module} release=${releaseId ?? "—"} artist=${artistId}`);

    await job.updateProgress({ stage: "starting", percent: 0 });

    // Mark job as RUNNING
    await prisma.aiJob.update({
      where: { id: jobId },
      data: { status: "RUNNING", startedAt: new Date() },
    });

    await job.updateProgress({ stage: "processing", percent: 30 });

    const result = await processModule(module, input, releaseId ?? "");

    await job.updateProgress({ stage: "saving", percent: 80 });

    // Save GeneratedContent and mark job SUCCEEDED in a transaction
    await prisma.$transaction(async (tx) => {
      if (releaseId) {
        await tx.generatedContent.create({
          data: {
            releaseId,
            module: result.generatedContent.module,
            status: "READY",
            payload: result.generatedContent.payload,
          },
        });
      }

      await tx.aiJob.update({
        where: { id: jobId },
        data: {
          status: "SUCCEEDED",
          finishedAt: new Date(),
          output: result.generatedContent.payload,
        },
      });
    });

    // Check if all jobs for this release are done → transition to CONTENT_REVIEW
    if (releaseId) {
      const allJobs = await prisma.aiJob.findMany({ where: { releaseId } });
      const allDone = allJobs.every((j) => j.status === "SUCCEEDED" || j.status === "FAILED");

      if (allDone) {
        const release = await prisma.release.findUnique({ where: { id: releaseId } });
        if (release?.status === "CONTENT_PENDING") {
          await prisma.$transaction([
            prisma.release.update({
              where: { id: releaseId },
              data: { status: "CONTENT_REVIEW" },
            }),
            prisma.releaseStatusEvent.create({
              data: {
                releaseId,
                fromStatus: "CONTENT_PENDING",
                toStatus: "CONTENT_REVIEW",
                event: "ai_pipeline_complete",
                actorRole: "system",
                actorRef: "worker",
              },
            }),
          ]);
          console.log(`[worker] release=${releaseId} → CONTENT_REVIEW`);
        }
      }
    }

    await job.updateProgress({ stage: "done", percent: 100 });
    console.log(`[worker] done job=${jobId} module=${module}`);
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

worker.on("failed", async (job, err) => {
  console.error(`[worker] failed job=${job?.id ?? "?"} error=${err.message}`);
  const jobId = job?.data?.jobId;
  if (jobId) {
    await prisma.aiJob
      .update({
        where: { id: jobId },
        data: { status: "FAILED", finishedAt: new Date(), error: err.message },
      })
      .catch((e) => console.error("[worker] failed to update job status", e));
  }
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
