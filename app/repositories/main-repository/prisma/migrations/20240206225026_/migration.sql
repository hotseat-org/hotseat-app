/*
  Warnings:

  - The primary key for the `Office` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "Profile" DROP CONSTRAINT "Profile_favoriteOfficeSlug_fkey";

-- DropIndex
DROP INDEX "Office_slug_key";

-- AlterTable
ALTER TABLE "Office" DROP CONSTRAINT "Office_pkey";

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_favoriteOfficeSlug_organizationSlug_fkey" FOREIGN KEY ("favoriteOfficeSlug", "organizationSlug") REFERENCES "Office"("slug", "organizationSlug") ON DELETE RESTRICT ON UPDATE CASCADE;
