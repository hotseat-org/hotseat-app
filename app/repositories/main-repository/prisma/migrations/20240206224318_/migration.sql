-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "favoriteOfficeSlug" TEXT;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_favoriteOfficeSlug_fkey" FOREIGN KEY ("favoriteOfficeSlug") REFERENCES "Office"("slug") ON DELETE SET NULL ON UPDATE CASCADE;
