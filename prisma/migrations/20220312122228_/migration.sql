-- CreateTable
CREATE TABLE `Seat` (
    `PK` INTEGER NOT NULL AUTO_INCREMENT,
    `id` VARCHAR(36) NOT NULL,
    `ownerPK` INTEGER NOT NULL,

    UNIQUE INDEX `Seat_id_key`(`id`),
    PRIMARY KEY (`PK`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reservation` (
    `PK` INTEGER NOT NULL AUTO_INCREMENT,
    `id` VARCHAR(36) NOT NULL,
    `from` DATETIME(3) NOT NULL,
    `to` DATETIME(3) NOT NULL,
    `byPK` INTEGER NOT NULL,
    `seatPK` INTEGER NOT NULL,

    UNIQUE INDEX `Reservation_id_key`(`id`),
    PRIMARY KEY (`PK`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Seat` ADD CONSTRAINT `Seat_ownerPK_fkey` FOREIGN KEY (`ownerPK`) REFERENCES `User`(`PK`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reservation` ADD CONSTRAINT `Reservation_byPK_fkey` FOREIGN KEY (`byPK`) REFERENCES `User`(`PK`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reservation` ADD CONSTRAINT `Reservation_seatPK_fkey` FOREIGN KEY (`seatPK`) REFERENCES `Seat`(`PK`) ON DELETE RESTRICT ON UPDATE CASCADE;
