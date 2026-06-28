-- Sincronização de drift: campos adicionados via db push sem migration formal

-- CompanySetting: campos ausentes do modelo inicial
ALTER TABLE "CompanySetting" ADD COLUMN IF NOT EXISTS "tipo" TEXT DEFAULT 'PJ';
ALTER TABLE "CompanySetting" ADD COLUMN IF NOT EXISTS "tradeName" TEXT;
ALTER TABLE "CompanySetting" ADD COLUMN IF NOT EXISTS "rg" TEXT;
ALTER TABLE "CompanySetting" ADD COLUMN IF NOT EXISTS "ie" TEXT;
ALTER TABLE "CompanySetting" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "CompanySetting" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "CompanySetting" ADD COLUMN IF NOT EXISTS "cep" TEXT;
ALTER TABLE "CompanySetting" ADD COLUMN IF NOT EXISTS "whatsApp" TEXT;

-- Customer: campos de endereço estruturado
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "addressNumber" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "neighborhood" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "cep" TEXT;

-- TradeInDevice: imei1 passa a ser opcional
ALTER TABLE "TradeInDevice" ALTER COLUMN "imei1" DROP NOT NULL;
