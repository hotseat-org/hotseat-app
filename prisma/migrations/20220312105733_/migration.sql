/*
  Warnings:

  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `User_id_key` ON `User`;

-- AlterTable
ALTER TABLE `User` DROP COLUMN `name`,
    ADD COLUMN `displayName` VARCHAR(191) NULL,
    MODIFY `id` VARCHAR(191) NOT NULL;
