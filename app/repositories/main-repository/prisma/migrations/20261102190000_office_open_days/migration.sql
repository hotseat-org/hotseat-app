-- AlterTable
ALTER TABLE "Office" ADD COLUMN     "openWeekdays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6, 7]::INTEGER[];

-- CreateTable
CREATE TABLE "OfficeClosedDay" (
    "organizationSlug" TEXT NOT NULL,
    "officeSlug" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfficeClosedDay_pkey" PRIMARY KEY ("organizationSlug","officeSlug","date")
);

-- AddForeignKey
ALTER TABLE "OfficeClosedDay" ADD CONSTRAINT "OfficeClosedDay_organizationSlug_officeSlug_fkey" FOREIGN KEY ("organizationSlug", "officeSlug") REFERENCES "Office"("organizationSlug", "slug") ON DELETE CASCADE ON UPDATE CASCADE;
