-- CreateTable
CREATE TABLE "OrganizationSlugRedirect" (
    "oldSlug" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationSlugRedirect_pkey" PRIMARY KEY ("oldSlug")
);

-- CreateTable
CREATE TABLE "OfficeSlugRedirect" (
    "organizationSlug" TEXT NOT NULL,
    "oldSlug" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfficeSlugRedirect_pkey" PRIMARY KEY ("organizationSlug","oldSlug")
);

-- AddForeignKey
ALTER TABLE "OrganizationSlugRedirect" ADD CONSTRAINT "OrganizationSlugRedirect_slug_fkey" FOREIGN KEY ("slug") REFERENCES "Organization"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeSlugRedirect" ADD CONSTRAINT "OfficeSlugRedirect_organizationSlug_slug_fkey" FOREIGN KEY ("organizationSlug", "slug") REFERENCES "Office"("organizationSlug", "slug") ON DELETE CASCADE ON UPDATE CASCADE;
