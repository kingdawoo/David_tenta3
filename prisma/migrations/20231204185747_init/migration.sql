/*
  Warnings:

  - You are about to drop the column `authorId` on the `post` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `post` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `post` DROP COLUMN `authorId`,
    DROP COLUMN `createdAt`,
    ADD COLUMN `image` VARCHAR(191) NULL;
