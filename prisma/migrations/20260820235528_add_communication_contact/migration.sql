/*
  Warnings:

  - You are about to drop the column `contactId` on the `Communication` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Communication` table. All the data in the column will be lost.
  - You are about to drop the column `direction` on the `Communication` table. All the data in the column will be lost.
  - You are about to drop the column `recipient` on the `Communication` table. All the data in the column will be lost.
  - You are about to drop the column `sender` on the `Communication` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Communication` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `CommunicationArtefact` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `OpportunityNote` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `OpportunityNote` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Communication" DROP CONSTRAINT "Communication_contactId_fkey";

-- DropIndex
DROP INDEX "Communication_contactId_idx";

-- DropIndex
DROP INDEX "OpportunityNote_opportunityId_createdAt_idx";

-- AlterTable
ALTER TABLE "Communication" DROP COLUMN "contactId",
DROP COLUMN "createdAt",
DROP COLUMN "direction",
DROP COLUMN "recipient",
DROP COLUMN "sender",
DROP COLUMN "updatedAt",
ADD COLUMN     "contact" TEXT;

-- AlterTable
ALTER TABLE "CommunicationArtefact" DROP COLUMN "createdAt";

-- AlterTable
ALTER TABLE "OpportunityNote" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- DropEnum
DROP TYPE "CommunicationDirection";

-- CreateIndex
CREATE INDEX "OpportunityNote_opportunityId_idx" ON "OpportunityNote"("opportunityId");
