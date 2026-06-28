-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- AlterEnum
ALTER TYPE "InstallmentStatus" ADD VALUE 'CANCELLED';

-- AlterEnum
ALTER TYPE "TransactionStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "status" "SaleStatus" NOT NULL DEFAULT 'ACTIVE';
