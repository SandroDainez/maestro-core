-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'Member',
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';
