-- DropForeignKey
ALTER TABLE `Seat` DROP FOREIGN KEY `Seat_ownerPK_fkey`;

-- AlterTable
ALTER TABLE `Seat` MODIFY `ownerPK` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Seat` ADD CONSTRAINT `Seat_ownerPK_fkey` FOREIGN KEY (`ownerPK`) REFERENCES `User`(`PK`) ON DELETE SET NULL ON UPDATE CASCADE;
