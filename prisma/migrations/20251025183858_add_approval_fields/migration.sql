/*
  Warnings:

  - A unique constraint covering the columns `[publicCode]` on the table `WorkOrder` will be added. If there are existing duplicate values, this will fail.
  - The required column `publicCode` was added to the `WorkOrder` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "denialReason" TEXT,
ADD COLUMN     "deniedAt" TIMESTAMP(3),
ADD COLUMN     "publicCode" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_publicCode_key" ON "WorkOrder"("publicCode");
