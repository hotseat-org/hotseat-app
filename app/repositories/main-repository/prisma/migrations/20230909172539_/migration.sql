/*
  Warnings:

  - A unique constraint covering the columns `[email,organizationSlug]` on the table `OrganizationInvite` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "OrganizationInvite_email_organizationSlug_key" ON "OrganizationInvite"("email", "organizationSlug");
