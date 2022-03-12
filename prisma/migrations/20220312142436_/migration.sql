/*
  Warnings:

  - You are about to drop the column `x` on the `Seat` table. All the data in the column will be lost.
  - You are about to drop the column `y` on the `Seat` table. All the data in the column will be lost.
  - Added the required column `index` to the `Seat` table without a default value. This is not possible if the table is not empty.
  - Added the required column `row` to the `Seat` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Seat` DROP COLUMN `x`,
    DROP COLUMN `y`,
    ADD COLUMN `index` INTEGER NOT NULL,
    ADD COLUMN `row` INTEGER NOT NULL;
