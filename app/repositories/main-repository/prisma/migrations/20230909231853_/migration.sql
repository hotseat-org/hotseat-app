/*
  Warnings:

  - You are about to drop the `Reservation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Room` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Seat` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Space` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Reservation" DROP CONSTRAINT "Reservation_byId_fkey";

-- DropForeignKey
ALTER TABLE "Reservation" DROP CONSTRAINT "Reservation_seatId_fkey";

-- DropForeignKey
ALTER TABLE "Room" DROP CONSTRAINT "Room_spaceId_fkey";

-- DropForeignKey
ALTER TABLE "Seat" DROP CONSTRAINT "Seat_residentId_fkey";

-- DropForeignKey
ALTER TABLE "Seat" DROP CONSTRAINT "Seat_spaceId_fkey";

-- DropForeignKey
ALTER TABLE "Space" DROP CONSTRAINT "Space_organizationSlug_fkey";

-- DropIndex
DROP INDEX "OrganizationInvite_organizationSlug_idx";

-- DropIndex
DROP INDEX "Profile_id_idx";

-- DropTable
DROP TABLE "Reservation";

-- DropTable
DROP TABLE "Room";

-- DropTable
DROP TABLE "Seat";

-- DropTable
DROP TABLE "Space";

-- CreateIndex
CREATE INDEX "OrganizationInvite_email_organizationSlug_idx" ON "OrganizationInvite"("email", "organizationSlug");
