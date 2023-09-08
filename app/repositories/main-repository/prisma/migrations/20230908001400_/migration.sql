-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "PK" SERIAL NOT NULL,
    "id" VARCHAR(36) NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("PK")
);

-- CreateTable
CREATE TABLE "Profile" (
    "PK" SERIAL NOT NULL,
    "id" VARCHAR(36) NOT NULL,
    "userPK" INTEGER NOT NULL,
    "organizationPK" INTEGER NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("PK")
);

-- CreateTable
CREATE TABLE "Organization" (
    "PK" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("PK")
);

-- CreateTable
CREATE TABLE "Seat" (
    "PK" SERIAL NOT NULL,
    "id" VARCHAR(36) NOT NULL,
    "furnitureId" TEXT NOT NULL,
    "residentPK" INTEGER,
    "spacePK" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Seat_pkey" PRIMARY KEY ("PK")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "PK" SERIAL NOT NULL,
    "id" VARCHAR(36) NOT NULL,
    "from" TIMESTAMP(3) NOT NULL,
    "to" TIMESTAMP(3) NOT NULL,
    "byPK" INTEGER NOT NULL,
    "seatPK" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("PK")
);

-- CreateTable
CREATE TABLE "Room" (
    "PK" SERIAL NOT NULL,
    "id" VARCHAR(36) NOT NULL,
    "name" TEXT NOT NULL,
    "spacePK" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("PK")
);

-- CreateTable
CREATE TABLE "Space" (
    "PK" SERIAL NOT NULL,
    "id" VARCHAR(36) NOT NULL,
    "organizationPK" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Space_pkey" PRIMARY KEY ("PK")
);

-- CreateTable
CREATE TABLE "_OrganizationToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_id_key" ON "Profile"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userPK_key" ON "Profile"("userPK");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_organizationPK_key" ON "Profile"("organizationPK");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Seat_id_key" ON "Seat"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Seat_furnitureId_key" ON "Seat"("furnitureId");

-- CreateIndex
CREATE UNIQUE INDEX "Seat_residentPK_key" ON "Seat"("residentPK");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_id_key" ON "Reservation"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_byPK_key" ON "Reservation"("byPK");

-- CreateIndex
CREATE UNIQUE INDEX "Room_id_key" ON "Room"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Space_id_key" ON "Space"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Space_organizationPK_key" ON "Space"("organizationPK");

-- CreateIndex
CREATE UNIQUE INDEX "Space_name_key" ON "Space"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_OrganizationToUser_AB_unique" ON "_OrganizationToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_OrganizationToUser_B_index" ON "_OrganizationToUser"("B");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userPK_fkey" FOREIGN KEY ("userPK") REFERENCES "User"("PK") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_organizationPK_fkey" FOREIGN KEY ("organizationPK") REFERENCES "Organization"("PK") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seat" ADD CONSTRAINT "Seat_residentPK_fkey" FOREIGN KEY ("residentPK") REFERENCES "Profile"("PK") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seat" ADD CONSTRAINT "Seat_spacePK_fkey" FOREIGN KEY ("spacePK") REFERENCES "Space"("PK") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_byPK_fkey" FOREIGN KEY ("byPK") REFERENCES "Profile"("PK") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_seatPK_fkey" FOREIGN KEY ("seatPK") REFERENCES "Seat"("PK") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_spacePK_fkey" FOREIGN KEY ("spacePK") REFERENCES "Space"("PK") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Space" ADD CONSTRAINT "Space_organizationPK_fkey" FOREIGN KEY ("organizationPK") REFERENCES "Organization"("PK") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OrganizationToUser" ADD CONSTRAINT "_OrganizationToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Organization"("PK") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OrganizationToUser" ADD CONSTRAINT "_OrganizationToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("PK") ON DELETE CASCADE ON UPDATE CASCADE;
