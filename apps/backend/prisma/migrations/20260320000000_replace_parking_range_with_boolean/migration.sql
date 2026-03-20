-- Add parking boolean column
ALTER TABLE "polygons" ADD COLUMN "parking" BOOLEAN;

-- Backfill: if min_parking had a value, set parking to true
UPDATE "polygons" SET "parking" = true WHERE "min_parking" IS NOT NULL;

-- Drop old columns
ALTER TABLE "polygons" DROP COLUMN "min_parking";
ALTER TABLE "polygons" DROP COLUMN "max_parking";
