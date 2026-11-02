-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "organizationSlug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "weekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "teamId" TEXT NOT NULL,
    "organizationSlug" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("teamId","userEmail")
);

-- CreateTable
CREATE TABLE "TeamZone" (
    "teamId" TEXT NOT NULL,
    "organizationSlug" TEXT NOT NULL,
    "officeSlug" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "keepDays" INTEGER,

    CONSTRAINT "TeamZone_pkey" PRIMARY KEY ("teamId","officeSlug")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_organizationSlug_name_key" ON "Team"("organizationSlug", "name");

-- CreateIndex
CREATE INDEX "TeamMember_organizationSlug_userEmail_idx" ON "TeamMember"("organizationSlug", "userEmail");

-- CreateIndex
CREATE INDEX "TeamZone_organizationSlug_officeSlug_idx" ON "TeamZone"("organizationSlug", "officeSlug");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_organizationSlug_fkey" FOREIGN KEY ("organizationSlug") REFERENCES "Organization"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userEmail_organizationSlug_fkey" FOREIGN KEY ("userEmail", "organizationSlug") REFERENCES "Profile"("userEmail", "organizationSlug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamZone" ADD CONSTRAINT "TeamZone_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamZone" ADD CONSTRAINT "TeamZone_organizationSlug_officeSlug_fkey" FOREIGN KEY ("organizationSlug", "officeSlug") REFERENCES "Office"("organizationSlug", "slug") ON DELETE CASCADE ON UPDATE CASCADE;

