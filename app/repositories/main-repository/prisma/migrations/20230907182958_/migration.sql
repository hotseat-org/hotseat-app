/*
  Warnings:

  - You are about to drop the `Permission` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `role` to the `Profile` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Permission` DROP FOREIGN KEY `Permission_organizationPK_fkey`;

-- DropIndex
DROP INDEX `Organization_name_key` ON `Organization`;

-- AlterTable
ALTER TABLE `Profile` ADD COLUMN `role` ENUM('USER', 'ADMIN') NOT NULL;

-- DropTable
DROP TABLE `Permission`;
