-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "executions" (
    "id" TEXT NOT NULL,
    "polygon_id" TEXT NOT NULL,
    "type" "PolygonType" NOT NULL,
    "status" "ExecutionStatus" NOT NULL,
    "properties_found" INTEGER NOT NULL DEFAULT 0,
    "properties_new" INTEGER NOT NULL DEFAULT 0,
    "performed_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "executions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "executions" ADD CONSTRAINT "executions_polygon_id_fkey" FOREIGN KEY ("polygon_id") REFERENCES "polygons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
