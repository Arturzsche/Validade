-- AlterTable
ALTER TABLE "batches" ADD COLUMN     "unit_cost" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "expiry_alerts" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "expiry_alerts_status_idx" ON "expiry_alerts"("status");

