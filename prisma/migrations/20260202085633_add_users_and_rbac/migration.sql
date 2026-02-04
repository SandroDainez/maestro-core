/*
  SAFE RBAC + USERS + PROJECT SLUG BACKFILL
  Maestro Core — Multi Tenant SaaS
*/

BEGIN;

--------------------------------------------------
-- PROJECT: slug seguro + backfill
--------------------------------------------------

ALTER TABLE "Project"
ADD COLUMN IF NOT EXISTS "slug" TEXT;

UPDATE "Project"
SET "slug" = lower(regexp_replace(name, '\s+', '-', 'g'))
WHERE "slug" IS NULL;

ALTER TABLE "Project"
ALTER COLUMN "slug" SET NOT NULL;

--------------------------------------------------
-- UNIQUE per tenant
--------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS "Project_tenant_slug_unique"
ON "Project"("tenantId", "slug");

--------------------------------------------------
-- USERS
--------------------------------------------------

CREATE TABLE IF NOT EXISTS "User" (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  passwordHash TEXT,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now()
);

--------------------------------------------------
-- ROLES
--------------------------------------------------

CREATE TABLE IF NOT EXISTS "Role" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT now()
);

--------------------------------------------------
-- TENANT MEMBERSHIP
--------------------------------------------------

CREATE TABLE IF NOT EXISTS "TenantUser" (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  userId TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  roleId TEXT REFERENCES "Role"(id),
  createdAt TIMESTAMP DEFAULT now(),
  UNIQUE (tenantId, userId)
);

--------------------------------------------------
-- DEFAULT ROLES
--------------------------------------------------

INSERT INTO "Role"(id, name)
VALUES
  ('role-owner', 'owner'),
  ('role-admin', 'admin'),
  ('role-developer', 'developer')
ON CONFLICT DO NOTHING;

COMMIT;

