import { Worker } from "bullmq";
import { connection, AI_JOBS_QUEUE, type AiJobPayload } from "./queues.js";
import { prisma } from "./lib/prisma.js";
import { runCoverModule } from "./modules/cover.js";
import { runSocialModule } from "./modules/social.js";
import { runBrandModule } from "./modules/brand.js";
import type { BrandJobInput } from "./modules/brand.js";

const BACKOFF_DELAYS = [5_000, 30_000, 120_000];

async function processModule(
  module: AiJobPayload["module"],
  input: unknown,
  _releaseId: string,
  onProgress: (pct: number) => void,
) {
  switch (module) {
    case "COVER": {
      const covers = await runCoverModule(input, onProgress);
      return { generatedContent: { module: "COVER" as const, payload: covers } };
    }

    case "SOCIAL": {
      const posts = await runSocialModule(input);
      return { generatedContent: { module: "SOCIAL" as const, payload: posts } };
    }

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

    case "BRAND": {
      const result = await runBrandModule(input, onProgress);
      return { generatedContent: { module: "BRAND" as const, payload: result } };
    }

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

    const result = await processModule(module, input, releaseId ?? "", (pct) => {
      void job.updateProgress({ stage: "processing", percent: pct });
    });

    await job.updateProgress({ stage: "saving", percent: 80 });

    // Save GeneratedContent and mark job SUCCEEDED in a transaction
    await prisma.$transaction(async (tx) => {
      if (releaseId) {
        await tx.generatedContent.create({
          data: {
            releaseId,
            module: result.generatedContent.module,
            status: "READY",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            payload: result.generatedContent.payload as any,
          },
        });
      }

      await tx.aiJob.update({
        where: { id: jobId },
        data: {
          status: "SUCCEEDED",
          finishedAt: new Date(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          output: result.generatedContent.payload as any,
        },
      });
    });

    // For BRAND jobs: store logomarkVariants (user selects one later → sets logomark)
    if (module === "BRAND") {
      const brandInput = job.data.input as BrandJobInput;
      if (brandInput.brandProfileId) {
        const bp = await prisma.brandProfile.findUnique({ where: { id: brandInput.brandProfileId } });
        if (bp) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data = bp.data as any;
          const logomarkVariants = (result.generatedContent.payload as { logomarkVariants: unknown }).logomarkVariants;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await prisma.brandProfile.update({ where: { id: bp.id }, data: { data: { ...data, identity: { ...data.identity, logomarkVariants } } as any } });
          console.log(`[worker] stored ${String(Array.isArray(logomarkVariants) ? logomarkVariants.length : 0)} logomark variants for brandProfile=${bp.id}`);
        }
      }
    }

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
    concurrency: 1,
    lockDuration: 600_000, // 10 min — BRAND jobs generate 3 images via Pollinations, each can take ~60-120s
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
