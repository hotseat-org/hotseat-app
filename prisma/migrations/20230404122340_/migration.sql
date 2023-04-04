/*
  Warnings:

  - You are about to drop the column `index` on the `Seat` table. All the data in the column will be lost.
  - You are about to drop the column `ownerPK` on the `Seat` table. All the data in the column will be lost.
  - You are about to drop the column `row` on the `Seat` table. All the data in the column will be lost.
  - Added the required column `x` to the `Seat` table without a default value. This is not possible if the table is not empty.
  - Added the required column `y` to the `Seat` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Seat` DROP FOREIGN KEY `Seat_ownerPK_fkey`;

-- AlterTable
ALTER TABLE `Seat` DROP COLUMN `index`,
    DROP COLUMN `ownerPK`,
    DROP COLUMN `row`,
    ADD COLUMN `residentPK` INTEGER NULL,
    ADD COLUMN `roomPK` INTEGER NULL,
    ADD COLUMN `x` INTEGER NOT NULL,
    ADD COLUMN `y` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `Room` (
    `PK` INTEGER NOT NULL AUTO_INCREMENT,
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Room_id_key`(`id`),
    PRIMARY KEY (`PK`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Seat` ADD CONSTRAINT `Seat_residentPK_fkey` FOREIGN KEY (`residentPK`) REFERENCES `User`(`PK`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Seat` ADD CONSTRAINT `Seat_roomPK_fkey` FOREIGN KEY (`roomPK`) REFERENCES `Room`(`PK`) ON DELETE SET NULL ON UPDATE CASCADE;
