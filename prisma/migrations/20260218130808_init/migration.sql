-- CreateEnum
CREATE TYPE "generation_status" AS ENUM ('PENDING', 'FAILED', 'COMPLETE');

-- AlterTable
ALTER TABLE "generations" ADD COLUMN     "status" "generation_status";
