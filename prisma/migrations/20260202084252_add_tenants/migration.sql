-- add tenants with backfill for existing data

BEGIN;

-- 1) create tenants table
CREATE TABLE IF NOT EXISTS "Tenant" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- 2) insert default tenant
INSERT INTO "Tenant" ("id", "name", "slug")
VALUES (
  gen_random_uuid(),
  'Default',
  'default'
)
ON CONFLICT ("slug") DO NOTHING;

-- 3) add nullable tenantId first
ALTER TABLE "Project"
ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

ALTER TABLE "Run"
ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

-- 4) fill existing rows
UPDATE "Project"
SET "tenantId" = (SELECT id FROM "Tenant" WHERE slug = 'default')
WHERE "tenantId" IS NULL;

UPDATE "Run"
SET "tenantId" = (SELECT id FROM "Tenant" WHERE slug = 'default')
WHERE "tenantId" IS NULL;

-- 5) make column required
ALTER TABLE "Project"
ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE "Run"
ALTER COLUMN "tenantId" SET NOT NULL;

-- 6) foreign keys
ALTER TABLE "Project"
ADD CONSTRAINT "Project_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;

ALTER TABLE "Run"
ADD CONSTRAINT "Run_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;

COMMIT;

