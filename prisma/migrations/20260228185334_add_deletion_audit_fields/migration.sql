-- AlterTable
ALTER TABLE "DeletionAudit" ADD COLUMN     "targetType" TEXT NOT NULL DEFAULT 'project',
ADD COLUMN     "userEmail" TEXT,
ADD COLUMN     "userId" TEXT,
ALTER COLUMN "projectSlug" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PipelinePhaseRun" ADD COLUMN     "details" TEXT,
ADD COLUMN     "outputs" JSONB;
