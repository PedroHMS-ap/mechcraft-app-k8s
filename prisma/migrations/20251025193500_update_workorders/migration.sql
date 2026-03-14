-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "finishedAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3);
