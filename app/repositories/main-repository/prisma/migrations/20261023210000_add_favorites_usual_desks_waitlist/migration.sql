-- CreateTable
CREATE TABLE "FavoriteDesk" (
    "organizationSlug" TEXT NOT NULL,
    "officeSlug" TEXT NOT NULL,
    "deskId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteDesk_pkey" PRIMARY KEY ("organizationSlug","officeSlug","userEmail","deskId")
);

-- CreateTable
CREATE TABLE "UsualDesk" (
    "organizationSlug" TEXT NOT NULL,
    "officeSlug" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "deskId" TEXT NOT NULL,
    "weekdays" INTEGER[],
    "bookedThrough" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsualDesk_pkey" PRIMARY KEY ("organizationSlug","officeSlug","userEmail")
);

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "organizationSlug" TEXT NOT NULL,
    "officeSlug" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("organizationSlug","officeSlug","userEmail","date")
);

-- CreateIndex
CREATE INDEX "WaitlistEntry_organizationSlug_officeSlug_date_createdAt_idx" ON "WaitlistEntry"("organizationSlug", "officeSlug", "date", "createdAt");

-- AddForeignKey
ALTER TABLE "FavoriteDesk" ADD CONSTRAINT "FavoriteDesk_organizationSlug_officeSlug_fkey" FOREIGN KEY ("organizationSlug", "officeSlug") REFERENCES "Office"("organizationSlug", "slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteDesk" ADD CONSTRAINT "FavoriteDesk_userEmail_organizationSlug_fkey" FOREIGN KEY ("userEmail", "organizationSlug") REFERENCES "Profile"("userEmail", "organizationSlug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsualDesk" ADD CONSTRAINT "UsualDesk_organizationSlug_officeSlug_fkey" FOREIGN KEY ("organizationSlug", "officeSlug") REFERENCES "Office"("organizationSlug", "slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsualDesk" ADD CONSTRAINT "UsualDesk_userEmail_organizationSlug_fkey" FOREIGN KEY ("userEmail", "organizationSlug") REFERENCES "Profile"("userEmail", "organizationSlug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_organizationSlug_officeSlug_fkey" FOREIGN KEY ("organizationSlug", "officeSlug") REFERENCES "Office"("organizationSlug", "slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_userEmail_organizationSlug_fkey" FOREIGN KEY ("userEmail", "organizationSlug") REFERENCES "Profile"("userEmail", "organizationSlug") ON DELETE CASCADE ON UPDATE CASCADE;
