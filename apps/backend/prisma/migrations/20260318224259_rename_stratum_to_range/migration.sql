/*
  Warnings:

  - You are about to drop the column `stratum` on the `polygons` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "polygons" DROP COLUMN "stratum",
ADD COLUMN     "max_stratum" SMALLINT,
ADD COLUMN     "min_stratum" SMALLINT;
