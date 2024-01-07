/*
  Warnings:

  - You are about to drop the column `avatarUrl` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `displayName` on the `Profile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "avatarUrl",
DROP COLUMN "displayName";
