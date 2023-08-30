/*
  Warnings:

  - You are about to alter the column `id` on the `User` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(36)`.
  - You are about to drop the `Photo` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[byPK]` on the table `Reservation` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[residentPK]` on the table `Seat` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organizationPK]` on the table `Space` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `organizationPK` to the `Space` table without a default value. This is not possible if the table is not empty.
  - Made the column `displayName` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `Photo` DROP FOREIGN KEY `Photo_userPK_fkey`;

-- DropForeignKey
ALTER TABLE `Reservation` DROP FOREIGN KEY `Reservation_byPK_fkey`;

-- DropForeignKey
ALTER TABLE `Seat` DROP FOREIGN KEY `Seat_residentPK_fkey`;

-- DropIndex
DROP INDEX `User_email_key` ON `User`;

-- AlterTable
ALTER TABLE `Space` ADD COLUMN `organizationPK` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `avatarUrl` VARCHAR(191) NULL,
    MODIFY `id` VARCHAR(36) NOT NULL,
    MODIFY `displayName` VARCHAR(191) NOT NULL;

-- DropTable
DROP TABLE `Photo`;

-- CreateTable
CREATE TABLE `Profile` (
    `PK` INTEGER NOT NULL AUTO_INCREMENT,
    `userPK` INTEGER NOT NULL,
    `organizationPK` INTEGER NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `avatarUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`PK`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Organization` (
    `PK` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Organization_name_key`(`name`),
    UNIQUE INDEX `Organization_slug_key`(`slug`),
    PRIMARY KEY (`PK`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Permission` (
    `PK` INTEGER NOT NULL AUTO_INCREMENT,
    `organizationPK` INTEGER NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('USER', 'ADMIN') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`PK`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_OrganizationToUser` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_OrganizationToUser_AB_unique`(`A`, `B`),
    INDEX `_OrganizationToUser_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Reservation_byPK_key` ON `Reservation`(`byPK`);

-- CreateIndex
CREATE UNIQUE INDEX `Seat_residentPK_key` ON `Seat`(`residentPK`);

-- CreateIndex
CREATE UNIQUE INDEX `Space_organizationPK_key` ON `Space`(`organizationPK`);

-- AddForeignKey
ALTER TABLE `Profile` ADD CONSTRAINT `Profile_userPK_fkey` FOREIGN KEY (`userPK`) REFERENCES `User`(`PK`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Profile` ADD CONSTRAINT `Profile_organizationPK_fkey` FOREIGN KEY (`organizationPK`) REFERENCES `Organization`(`PK`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Permission` ADD CONSTRAINT `Permission_organizationPK_fkey` FOREIGN KEY (`organizationPK`) REFERENCES `Organization`(`PK`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Seat` ADD CONSTRAINT `Seat_residentPK_fkey` FOREIGN KEY (`residentPK`) REFERENCES `Profile`(`PK`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reservation` ADD CONSTRAINT `Reservation_byPK_fkey` FOREIGN KEY (`byPK`) REFERENCES `Profile`(`PK`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Space` ADD CONSTRAINT `Space_organizationPK_fkey` FOREIGN KEY (`organizationPK`) REFERENCES `Organization`(`PK`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_OrganizationToUser` ADD CONSTRAINT `_OrganizationToUser_A_fkey` FOREIGN KEY (`A`) REFERENCES `Organization`(`PK`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_OrganizationToUser` ADD CONSTRAINT `_OrganizationToUser_B_fkey` FOREIGN KEY (`B`) REFERENCES `User`(`PK`) ON DELETE CASCADE ON UPDATE CASCADE;
