-- CreateEnum
CREATE TYPE "TradeInStatus" AS ENUM ('AGUARDANDO_AVALIACAO', 'DISPONIVEL', 'EM_REPARO', 'AGUARDANDO_PECAS', 'EM_MANUTENCAO', 'EM_TESTES', 'RESERVADO', 'VENDIDO', 'SUCATA', 'DEVOLVIDO');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "appleWarrantyUntil" TIMESTAMP(3),
ADD COLUMN     "condition" TEXT,
ADD COLUMN     "hasAppleWarranty" BOOLEAN,
ADD COLUMN     "isTradeIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tradeInDeviceId" TEXT;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "signedContractUrl" TEXT,
ADD COLUMN     "tradeInAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TradeInDevice" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "storage" TEXT NOT NULL,
    "imei1" TEXT NOT NULL,
    "imei2" TEXT,
    "serialNumber" TEXT,
    "carrier" TEXT,
    "evaluationPrice" DOUBLE PRECISION NOT NULL,
    "condition" TEXT NOT NULL,
    "notes" TEXT,
    "photos" TEXT,
    "checklist" TEXT,
    "status" "TradeInStatus" NOT NULL DEFAULT 'AGUARDANDO_AVALIACAO',
    "saleId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "evaluatedById" TEXT,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeInDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeInRepair" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "defect" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "parts" TEXT,
    "cost" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "technician" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeInRepair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeInStatusHistory" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "status" "TradeInStatus" NOT NULL,
    "note" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeInStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TradeInDevice_saleId_key" ON "TradeInDevice"("saleId");

-- AddForeignKey
ALTER TABLE "TradeInDevice" ADD CONSTRAINT "TradeInDevice_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeInRepair" ADD CONSTRAINT "TradeInRepair_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "TradeInDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeInStatusHistory" ADD CONSTRAINT "TradeInStatusHistory_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "TradeInDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
