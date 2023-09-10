/*
  Warnings:

  - The primary key for the `OrganizationInvite` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `token` on the `OrganizationInvite` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[invitationHash]` on the table `Organization` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "OrganizationInvite_token_idx";

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "invitationHash" TEXT;

-- AlterTable
ALTER TABLE "OrganizationInvite" DROP CONSTRAINT "OrganizationInvite_pkey",
DROP COLUMN "token";

-- CreateIndex
CREATE UNIQUE INDEX "Organization_invitationHash_key" ON "Organization"("invitationHash");

-- CreateIndex
CREATE INDEX "Organization_invitationHash_idx" ON "Organization"("invitationHash");
