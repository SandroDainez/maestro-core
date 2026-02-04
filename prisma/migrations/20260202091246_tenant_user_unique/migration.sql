/*
 Fix TenantUser unique constraint safely
 Works for shadow + real DB
*/

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'TenantUser_tenantid_userid_key'
           OR conname = 'TenantUser_tenantId_userId_key'
    ) THEN
        ALTER TABLE "TenantUser"
        ADD CONSTRAINT "TenantUser_tenantid_userid_key"
        UNIQUE (tenantid, userid);
    END IF;
END$$;

COMMIT;

