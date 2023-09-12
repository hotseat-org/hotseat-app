/*
  Warnings:

  - The primary key for the `Profile` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Profile` table. All the data in the column will be lost.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userEmail,organizationSlug]` on the table `Profile` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userEmail` to the `Profile` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Profile" DROP CONSTRAINT "Profile_userId_fkey";

-- DropIndex
DROP INDEX "Organization_slug_idx";

-- DropIndex
DROP INDEX "OrganizationInvite_email_organizationSlug_idx";

-- DropIndex
DROP INDEX "Profile_userId_organizationSlug_idx";

-- DropIndex
DROP INDEX "Profile_userId_organizationSlug_key";

-- DropIndex
DROP INDEX "User_id_idx";

-- AlterTable
ALTER TABLE "Profile" DROP CONSTRAINT "Profile_pkey",
DROP COLUMN "id",
DROP COLUMN "userId",
ADD COLUMN     "userEmail" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
DROP COLUMN "id";

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userEmail_organizationSlug_key" ON "Profile"("userEmail", "organizationSlug");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userEmail_fkey" FOREIGN KEY ("userEmail") REFERENCES "User"("email") ON DELETE CASCADE ON UPDATE CASCADE;
