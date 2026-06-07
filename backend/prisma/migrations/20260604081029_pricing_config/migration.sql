-- CreateEnum
CREATE TYPE "MarkupType" AS ENUM ('PERCENT', 'FLAT');

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "markupType" "MarkupType",
ADD COLUMN     "markupValue" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "PlatformPricing" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "globalMarkupType" "MarkupType" NOT NULL,
    "globalMarkupValue" DECIMAL(10,2) NOT NULL,
    "baseDeliveryFee" DECIMAL(10,2) NOT NULL,
    "surgeFee" DECIMAL(10,2) NOT NULL,
    "surgeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformPricing_pkey" PRIMARY KEY ("id")
);
