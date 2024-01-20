/*
  Warnings:

  - The primary key for the `Office` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Office` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Office` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organizationSlug,slug]` on the table `Office` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `Office` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Office_id_key";

-- AlterTable
ALTER TABLE "Office" DROP CONSTRAINT "Office_pkey",
DROP COLUMN "id",
ADD COLUMN     "slug" TEXT NOT NULL,
ADD CONSTRAINT "Office_pkey" PRIMARY KEY ("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Office_slug_key" ON "Office"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Office_organizationSlug_slug_key" ON "Office"("organizationSlug", "slug");
