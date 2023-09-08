/*
  Warnings:

  - A unique constraint covering the columns `[userPK,organizationPK]` on the table `Profile` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Profile_id_userPK_organizationPK_idx";

-- DropIndex
DROP INDEX "User_id_email_idx";

-- CreateIndex
CREATE INDEX "Profile_id_idx" ON "Profile"("id");

-- CreateIndex
CREATE INDEX "Profile_userPK_idx" ON "Profile"("userPK");

-- CreateIndex
CREATE INDEX "Profile_organizationPK_idx" ON "Profile"("organizationPK");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userPK_organizationPK_key" ON "Profile"("userPK", "organizationPK");

-- CreateIndex
CREATE INDEX "User_id_idx" ON "User"("id");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");
