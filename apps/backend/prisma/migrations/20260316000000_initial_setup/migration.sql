-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "PropertyState" AS ENUM ('ORIGINAL', 'REMODELED');

-- CreateEnum
CREATE TYPE "PolygonType" AS ENUM ('EXTRACT', 'ANALYZE');

-- CreateTable
CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "state" "PropertyState" NOT NULL,
    "area" DECIMAL(10,2) NOT NULL,
    "price" INTEGER NOT NULL,
    "age" TEXT NOT NULL,
    "admin_price" INTEGER NOT NULL,
    "price_per_sqm" DECIMAL(12,2) NOT NULL,
    "address" TEXT NOT NULL,
    "neighborhood" TEXT NOT NULL,
    "rooms" INTEGER NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "floor" INTEGER NOT NULL,
    "elevator" BOOLEAN NOT NULL DEFAULT false,
    "stratum" SMALLINT NOT NULL,
    "parking" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "extracted_at" TIMESTAMPTZ NOT NULL,
    "duplicated_of_id" TEXT,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "polygons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "georeference" geometry(Polygon, 4326) NOT NULL,
    "city" TEXT NOT NULL,
    "polygon_type" "PolygonType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "params" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "polygons_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_duplicated_of_id_fkey" FOREIGN KEY ("duplicated_of_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

