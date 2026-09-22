-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('MANUAL', 'AUTOMATIC');

-- AlterTable
ALTER TABLE "payment_methods" ADD COLUMN     "mode" "PaymentMode" NOT NULL DEFAULT 'MANUAL';
