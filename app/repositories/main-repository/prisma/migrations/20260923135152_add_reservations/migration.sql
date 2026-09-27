-- AlterTable
ALTER TABLE "Office" ADD COLUMN     "bookingWindowDays" INTEGER NOT NULL DEFAULT 14,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Europe/Prague';

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "organizationSlug" TEXT NOT NULL,
    "officeSlug" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "deskId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "seriesId" TEXT,
    "createdByEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reservation_organizationSlug_officeSlug_date_idx" ON "Reservation"("organizationSlug", "officeSlug", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_organizationSlug_officeSlug_deskId_date_key" ON "Reservation"("organizationSlug", "officeSlug", "deskId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_organizationSlug_userEmail_date_key" ON "Reservation"("organizationSlug", "userEmail", "date");

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_organizationSlug_officeSlug_fkey" FOREIGN KEY ("organizationSlug", "officeSlug") REFERENCES "Office"("organizationSlug", "slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_userEmail_organizationSlug_fkey" FOREIGN KEY ("userEmail", "organizationSlug") REFERENCES "Profile"("userEmail", "organizationSlug") ON DELETE CASCADE ON UPDATE CASCADE;
