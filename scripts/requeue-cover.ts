import { PrismaClient } from "@prisma/client";
import { Queue } from "bullmq";
import { Redis } from "ioredis";

async function main() {
  const releaseId = process.argv[2];
  if (!releaseId) {
    console.error("Usage: tsx scripts/requeue-cover.ts <releaseId>");
    process.exit(1);
  }

  const prisma = new PrismaClient();

  const release = await prisma.release.findUnique({
    where: { id: releaseId },
    include: { brandProfile: true },
  });
  if (!release) {
    console.error("Release not found:", releaseId);
    await prisma.$disconnect();
    process.exit(1);
  }

  const deleted = await prisma.generatedContent.deleteMany({
    where: { releaseId, module: "COVER" },
  });
  console.log(`Deleted ${String(deleted.count)} old COVER entries`);

  const jobId = `${releaseId}-COVER-${String(Date.now())}`;
  const aiJob = await prisma.aiJob.create({
    data: {
      releaseId,
      module: "COVER",
      jobId,
      status: "QUEUED",
      input: {
        releaseId,
        artistId: release.artistId,
        brandProfileData: release.brandProfile.data,
        release: { title: release.title },
      },
    },
  });
  console.log("Created AiJob:", aiJob.id);

  const connection = new Redis(process.env["REDIS_URL"] ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });
  const queue = new Queue("ai-jobs", { connection });
  await queue.add(
    "COVER",
    { jobId: aiJob.id, module: "COVER", releaseId, artistId: release.artistId, input: aiJob.input },
    { jobId: aiJob.id, attempts: 3, backoff: { type: "custom" } },
  );
  console.log("Enqueued. Run the worker to generate covers.");

  await queue.close();
  await connection.quit();
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
