/*
  Warnings:

  - Added the required column `type` to the `PipelineRun` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PipelineRun" ADD COLUMN     "analysis" JSONB,
ADD COLUMN     "riskLevel" TEXT,
ADD COLUMN     "score" INTEGER,
ADD COLUMN     "type" TEXT NOT NULL;
