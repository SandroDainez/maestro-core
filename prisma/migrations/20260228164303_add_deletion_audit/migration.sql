-- DropForeignKey
ALTER TABLE "PipelinePhaseRun" DROP CONSTRAINT "PipelinePhaseRun_runId_fkey";

-- AlterTable
ALTER TABLE "PipelinePhaseRun" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "startedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "finishedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "status" DROP DEFAULT;

-- CreateTable
CREATE TABLE "ProductAnalysis" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "stabilityScore" INTEGER NOT NULL,
    "architectureScore" INTEGER NOT NULL,
    "securityScore" INTEGER NOT NULL,
    "maturityScore" INTEGER NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeletionAudit" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "projectSlug" TEXT NOT NULL,
    "runId" TEXT,
    "performedBy" TEXT NOT NULL,
    "reason" TEXT,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeletionAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductAnalysis_projectId_idx" ON "ProductAnalysis"("projectId");

-- AddForeignKey
ALTER TABLE "PipelinePhaseRun" ADD CONSTRAINT "PipelinePhaseRun_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PipelineRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAnalysis" ADD CONSTRAINT "ProductAnalysis_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "PipelinePhaseRun_runId_index" RENAME TO "PipelinePhaseRun_runId_idx";
