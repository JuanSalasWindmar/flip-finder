import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Res } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger"
import { Response } from "express"
import { PropertiesService } from "./properties.service"
import { CreatePropertyDto } from "./dto/create-property.dto"
import { UpdatePropertyDto } from "./dto/update-property.dto"
import { BulkUpdatePropertyDto } from "./dto/bulk-update-property.dto"

@ApiTags("Properties")
@Controller("properties")
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  @ApiOperation({ summary: "Create a new property" })
  create(@Body() dto: CreatePropertyDto) {
    return this.propertiesService.create(dto)
  }

  @Get()
  @ApiOperation({ summary: "List properties with optional filters" })
  @ApiQuery({ name: "format", required: false, enum: ["json", "csv"] })
  @ApiQuery({ name: "polygon_id", required: false, description: "Filter properties inside a polygon" })
  @ApiQuery({ name: "min_area", required: false, description: "Min area or 'null' for empty" })
  @ApiQuery({ name: "max_area", required: false, description: "Max area or 'null' for empty" })
  @ApiQuery({ name: "state", required: false, description: "ORIGINAL, REMODELED or 'null' for empty" })
  @ApiQuery({ name: "floor", required: false, description: "Floor number or 'null' for empty" })
  @ApiQuery({ name: "reviewed", required: false, enum: ["true", "false"] })
  @ApiQuery({ name: "avg_age", required: false, description: "Age value or 'null' for empty" })
  @ApiQuery({ name: "duplicated_of", required: false, description: "'has' for duplicates, 'null' for non-duplicates" })
  async findAll(
    @Query("format") format: string,
    @Query("polygon_id") polygonId: string,
    @Query("min_area") minArea: string,
    @Query("max_area") maxArea: string,
    @Query("state") state: string,
    @Query("floor") floor: string,
    @Query("reviewed") reviewed: string,
    @Query("avg_age") avgAge: string,
    @Query("duplicated_of") duplicatedOf: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const filters = { polygonId, minArea, maxArea, state, floor, reviewed, avgAge, duplicatedOf }

    if (format === "csv") {
      const csv = await this.propertiesService.findAllCsv(filters)
      res.set({
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=properties.csv",
      })
      res.send(csv)
      return
    }

    return this.propertiesService.findAll(filters)
  }

  @Patch("bulk/update")
  @ApiOperation({ summary: "Bulk update properties" })
  bulkUpdate(@Body() dto: BulkUpdatePropertyDto) {
    return this.propertiesService.bulkUpdate(dto.properties)
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a property by ID" })
  findOne(@Param("id") id: string) {
    return this.propertiesService.findOne(id)
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a property" })
  update(@Param("id") id: string, @Body() dto: UpdatePropertyDto) {
    return this.propertiesService.update(id, dto)
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a property" })
  remove(@Param("id") id: string) {
    return this.propertiesService.remove(id)
  }
}
