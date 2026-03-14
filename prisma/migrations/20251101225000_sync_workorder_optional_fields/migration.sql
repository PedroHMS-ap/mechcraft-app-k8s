-- Sync optional fields on WorkOrder to match schema.prisma
-- Safe-guards with IF NOT EXISTS to avoid errors if already present

ALTER TABLE "WorkOrder"
  ADD COLUMN IF NOT EXISTS "estimateSentAt" TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS "estimateSentBy" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "approvedBy" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "deniedBy" TEXT NULL;

