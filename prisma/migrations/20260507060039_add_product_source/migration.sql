-- CreateEnum
CREATE TYPE "ProductSource" AS ENUM ('BC', 'MANUAL');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "source" "ProductSource" NOT NULL DEFAULT 'BC';

-- CreateIndex
CREATE INDEX "Product_source_idx" ON "Product"("source");

-- CreateIndex
CREATE INDEX "Product_source_active_idx" ON "Product"("source", "active");
