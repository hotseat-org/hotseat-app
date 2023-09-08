/*
  Warnings:

  - A unique constraint covering the columns `[userPK,organizationPK]` on the table `Profile` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Profile_organizationPK_key";

-- DropIndex
DROP INDEX "Profile_userPK_key";

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userPK_organizationPK_key" ON "Profile"("userPK", "organizationPK");
