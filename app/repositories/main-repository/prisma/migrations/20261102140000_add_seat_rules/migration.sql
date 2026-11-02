-- CreateTable
CREATE TABLE "SeatRules" (
    "organizationSlug" TEXT NOT NULL,
    "officeSlug" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "rules" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeatRules_pkey" PRIMARY KEY ("organizationSlug","officeSlug","userEmail")
);

-- AddForeignKey
ALTER TABLE "SeatRules" ADD CONSTRAINT "SeatRules_organizationSlug_officeSlug_fkey" FOREIGN KEY ("organizationSlug", "officeSlug") REFERENCES "Office"("organizationSlug", "slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatRules" ADD CONSTRAINT "SeatRules_userEmail_organizationSlug_fkey" FOREIGN KEY ("userEmail", "organizationSlug") REFERENCES "Profile"("userEmail", "organizationSlug") ON DELETE CASCADE ON UPDATE CASCADE;
