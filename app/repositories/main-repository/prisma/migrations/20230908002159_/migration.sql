-- DropForeignKey
ALTER TABLE "Profile" DROP CONSTRAINT "Profile_organizationPK_fkey";

-- DropForeignKey
ALTER TABLE "Profile" DROP CONSTRAINT "Profile_userPK_fkey";

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userPK_fkey" FOREIGN KEY ("userPK") REFERENCES "User"("PK") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_organizationPK_fkey" FOREIGN KEY ("organizationPK") REFERENCES "Organization"("PK") ON DELETE CASCADE ON UPDATE CASCADE;
