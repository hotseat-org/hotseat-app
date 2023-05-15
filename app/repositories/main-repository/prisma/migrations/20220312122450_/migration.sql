/*
  Warnings:

  - Added the required column `x` to the `Seat` table without a default value. This is not possible if the table is not empty.
  - Added the required column `y` to the `Seat` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Seat` ADD COLUMN `x` INTEGER NOT NULL,
    ADD COLUMN `y` INTEGER NOT NULL;
