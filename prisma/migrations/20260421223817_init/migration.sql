-- CreateEnum
CREATE TYPE "BrandStatus" AS ENUM ('DRAFT', 'LOCKED');

-- CreateEnum
CREATE TYPE "ReleaseStatus" AS ENUM ('DRAFT', 'CONTENT_PENDING', 'CONTENT_REVIEW', 'MODERATION_QUEUE', 'APPROVED', 'REJECTED', 'DISTRIBUTING', 'LIVE');

-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('AUDIO_MASTER', 'COVER', 'LYRICS', 'SOCIAL_POST', 'TEASER_VIDEO', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetSource" AS ENUM ('USER_UPLOAD', 'AI_GENERATED');

-- CreateEnum
CREATE TYPE "AiModule" AS ENUM ('BRAND', 'COVER', 'SOCIAL', 'TEASER');

-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('PENDING', 'READY', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "ModerationAction" AS ENUM ('APPROVED', 'REJECTED', 'SENT_BACK');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "currentBrandId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandProfile" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "BrandStatus" NOT NULL DEFAULT 'DRAFT',
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BrandProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Release" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "brandProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ReleaseStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledFor" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "pipelineConfig" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Release_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "kind" "AssetKind" NOT NULL,
    "source" "AssetSource" NOT NULL,
    "generatedContentId" TEXT,
    "url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedContent" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "module" "AiModule" NOT NULL,
    "status" "GenerationStatus" NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "GeneratedContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiJob" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT,
    "module" "AiModule" NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "input" JSONB NOT NULL,
    "output" JSONB,
    "error" TEXT,
    "costMeta" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "AiJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationRecord" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "action" "ModerationAction" NOT NULL,
    "reason" TEXT,
    "moderatorEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseStatusEvent" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "fromStatus" "ReleaseStatus" NOT NULL,
    "toStatus" "ReleaseStatus" NOT NULL,
    "event" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "actorRef" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReleaseStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Artist_slug_key" ON "Artist"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Artist_currentBrandId_key" ON "Artist"("currentBrandId");

-- CreateIndex
CREATE INDEX "Artist_userId_idx" ON "Artist"("userId");

-- CreateIndex
CREATE INDEX "Artist_deletedAt_idx" ON "Artist"("deletedAt");

-- CreateIndex
CREATE INDEX "BrandProfile_artistId_idx" ON "BrandProfile"("artistId");

-- CreateIndex
CREATE INDEX "BrandProfile_deletedAt_idx" ON "BrandProfile"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BrandProfile_artistId_version_key" ON "BrandProfile"("artistId", "version");

-- CreateIndex
CREATE INDEX "Release_artistId_status_idx" ON "Release"("artistId", "status");

-- CreateIndex
CREATE INDEX "Release_status_scheduledFor_idx" ON "Release"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "Release_deletedAt_idx" ON "Release"("deletedAt");

-- CreateIndex
CREATE INDEX "Asset_releaseId_kind_idx" ON "Asset"("releaseId", "kind");

-- CreateIndex
CREATE INDEX "GeneratedContent_releaseId_module_idx" ON "GeneratedContent"("releaseId", "module");

-- CreateIndex
CREATE UNIQUE INDEX "AiJob_jobId_key" ON "AiJob"("jobId");

-- CreateIndex
CREATE INDEX "AiJob_releaseId_module_idx" ON "AiJob"("releaseId", "module");

-- CreateIndex
CREATE INDEX "AiJob_status_idx" ON "AiJob"("status");

-- CreateIndex
CREATE INDEX "ModerationRecord_releaseId_idx" ON "ModerationRecord"("releaseId");

-- CreateIndex
CREATE INDEX "ReleaseStatusEvent_releaseId_idx" ON "ReleaseStatusEvent"("releaseId");

-- AddForeignKey
ALTER TABLE "Artist" ADD CONSTRAINT "Artist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artist" ADD CONSTRAINT "Artist_currentBrandId_fkey" FOREIGN KEY ("currentBrandId") REFERENCES "BrandProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandProfile" ADD CONSTRAINT "BrandProfile_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Release" ADD CONSTRAINT "Release_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Release" ADD CONSTRAINT "Release_brandProfileId_fkey" FOREIGN KEY ("brandProfileId") REFERENCES "BrandProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_generatedContentId_fkey" FOREIGN KEY ("generatedContentId") REFERENCES "GeneratedContent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedContent" ADD CONSTRAINT "GeneratedContent_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiJob" ADD CONSTRAINT "AiJob_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationRecord" ADD CONSTRAINT "ModerationRecord_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseStatusEvent" ADD CONSTRAINT "ReleaseStatusEvent_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
