/*
  Warnings:

  - You are about to drop the column `spaceUrl` on the `Office` table. All the data in the column will be lost.
  - Made the column `spaceId` on table `Office` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Office" DROP COLUMN "spaceUrl",
ALTER COLUMN "spaceId" SET NOT NULL;
