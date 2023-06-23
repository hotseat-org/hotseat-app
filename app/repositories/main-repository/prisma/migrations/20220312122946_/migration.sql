-- CreateTable
CREATE TABLE `Photo` (
    `url` VARCHAR(191) NOT NULL,
    `userPK` INTEGER NOT NULL,

    UNIQUE INDEX `Photo_url_key`(`url`),
    PRIMARY KEY (`url`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Photo` ADD CONSTRAINT `Photo_userPK_fkey` FOREIGN KEY (`userPK`) REFERENCES `User`(`PK`) ON DELETE RESTRICT ON UPDATE CASCADE;
