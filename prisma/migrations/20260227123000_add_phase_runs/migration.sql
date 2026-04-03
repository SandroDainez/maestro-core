-- Criado manualmente: rastrear fases de pipeline em tabela dedicada
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "PipelinePhaseRun" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "runId" TEXT NOT NULL,
  "phase" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "logs" JSONB,
  "error" TEXT,
  "startedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "finishedAt" TIMESTAMPTZ,
  CONSTRAINT "PipelinePhaseRun_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PipelineRun"("id") ON DELETE CASCADE
);

CREATE INDEX "PipelinePhaseRun_runId_index" ON "PipelinePhaseRun"("runId");
