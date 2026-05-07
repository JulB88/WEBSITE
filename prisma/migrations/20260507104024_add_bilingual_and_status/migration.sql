-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "descriptionEn" TEXT,
ADD COLUMN     "nameEn" TEXT,
ADD COLUMN     "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "Product"("status");
