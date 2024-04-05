/*
  Warnings:

  - You are about to drop the column `thumbnailUrl` on the `Office` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Office" DROP COLUMN "thumbnailUrl",
ADD COLUMN     "thumbnail" TEXT;
