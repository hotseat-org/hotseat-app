-- CreateTable
CREATE TABLE "RoomKit" (
    "id" TEXT NOT NULL,
    "organizationSlug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "area" DOUBLE PRECISION NOT NULL,
    "objects" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomKit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoomKit_organizationSlug_idx" ON "RoomKit"("organizationSlug");

-- AddForeignKey
ALTER TABLE "RoomKit" ADD CONSTRAINT "RoomKit_organizationSlug_fkey" FOREIGN KEY ("organizationSlug") REFERENCES "Organization"("slug") ON DELETE CASCADE ON UPDATE CASCADE;
