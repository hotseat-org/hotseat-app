-- CreateTable
CREATE TABLE "DeskRelease" (
    "organizationSlug" TEXT NOT NULL,
    "officeSlug" TEXT NOT NULL,
    "deskId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "userEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeskRelease_pkey" PRIMARY KEY ("organizationSlug","officeSlug","deskId","date")
);

-- AddForeignKey
ALTER TABLE "DeskRelease" ADD CONSTRAINT "DeskRelease_organizationSlug_officeSlug_fkey" FOREIGN KEY ("organizationSlug", "officeSlug") REFERENCES "Office"("organizationSlug", "slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeskRelease" ADD CONSTRAINT "DeskRelease_userEmail_organizationSlug_fkey" FOREIGN KEY ("userEmail", "organizationSlug") REFERENCES "Profile"("userEmail", "organizationSlug") ON DELETE CASCADE ON UPDATE CASCADE;
