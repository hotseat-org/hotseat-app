/*
  Warnings:

  - A unique constraint covering the columns `[seatPK]` on the table `Reservation` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "Organization_slug_idx" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Profile_id_userPK_organizationPK_idx" ON "Profile"("id", "userPK", "organizationPK");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_seatPK_key" ON "Reservation"("seatPK");

-- CreateIndex
CREATE INDEX "User_id_email_idx" ON "User"("id", "email");
