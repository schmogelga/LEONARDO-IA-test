-- AlterTable
ALTER TABLE "generations" ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "maxRetries" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "nextRetryAt" TIMESTAMP(3),
ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0;
