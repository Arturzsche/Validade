-- CreateTable
CREATE TABLE "daily_reports" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "channel" "AlertChannel" NOT NULL DEFAULT 'CONSOLE',
    "status" "AlertStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "recipient" TEXT,
    "message" TEXT,
    "error" TEXT,
    "items_count" INTEGER NOT NULL DEFAULT 0,
    "value_at_risk" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sent_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_reports_status_idx" ON "daily_reports"("status");

-- CreateIndex
CREATE UNIQUE INDEX "daily_reports_store_id_date_key" ON "daily_reports"("store_id", "date");

-- AddForeignKey
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

