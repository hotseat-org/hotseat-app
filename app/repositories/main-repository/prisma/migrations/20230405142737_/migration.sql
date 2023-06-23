/*
  Warnings:

  - You are about to drop the column `roomPK` on the `Seat` table. All the data in the column will be lost.
  - You are about to drop the column `x` on the `Seat` table. All the data in the column will be lost.
  - You are about to drop the column `y` on the `Seat` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[furnitureId]` on the table `Seat` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `spacePK` to the `Room` table without a default value. This is not possible if the table is not empty.
  - Added the required column `furnitureId` to the `Seat` table without a default value. This is not possible if the table is not empty.
  - Added the required column `spacePK` to the `Seat` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Seat` DROP FOREIGN KEY `Seat_roomPK_fkey`;

-- AlterTable
ALTER TABLE `Room` ADD COLUMN `spacePK` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `Seat` DROP COLUMN `roomPK`,
    DROP COLUMN `x`,
    DROP COLUMN `y`,
    ADD COLUMN `furnitureId` VARCHAR(191) NOT NULL,
    ADD COLUMN `spacePK` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `Space` (
    `PK` INTEGER NOT NULL AUTO_INCREMENT,
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `spaceId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Space_id_key`(`id`),
    UNIQUE INDEX `Space_name_key`(`name`),
    PRIMARY KEY (`PK`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Seat_furnitureId_key` ON `Seat`(`furnitureId`);

-- AddForeignKey
ALTER TABLE `Seat` ADD CONSTRAINT `Seat_spacePK_fkey` FOREIGN KEY (`spacePK`) REFERENCES `Space`(`PK`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Room` ADD CONSTRAINT `Room_spacePK_fkey` FOREIGN KEY (`spacePK`) REFERENCES `Space`(`PK`) ON DELETE RESTRICT ON UPDATE CASCADE;
