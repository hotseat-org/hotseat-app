-- CreateTable
CREATE TABLE "Seat" (
    "PK" SERIAL NOT NULL,
    "id" VARCHAR(36) NOT NULL,
    "furnitureId" TEXT NOT NULL,
    "residentId" TEXT,
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
    "userId" TEXT NOT NULL,
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
    "name" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Space_pkey" PRIMARY KEY ("PK")
);

-- CreateIndex
CREATE UNIQUE INDEX "Seat_id_key" ON "Seat"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Seat_furnitureId_key" ON "Seat"("furnitureId");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_id_key" ON "Reservation"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Room_id_key" ON "Room"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Space_id_key" ON "Space"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Space_name_key" ON "Space"("name");

-- AddForeignKey
ALTER TABLE "Seat" ADD CONSTRAINT "Seat_spacePK_fkey" FOREIGN KEY ("spacePK") REFERENCES "Space"("PK") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_seatPK_fkey" FOREIGN KEY ("seatPK") REFERENCES "Seat"("PK") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_spacePK_fkey" FOREIGN KEY ("spacePK") REFERENCES "Space"("PK") ON DELETE RESTRICT ON UPDATE CASCADE;
