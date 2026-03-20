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
  @ApiOperation({ summary: "List properties, optionally filtered by polygon" })
  @ApiQuery({ name: "format", required: false, enum: ["json", "csv"] })
  @ApiQuery({ name: "polygon_id", required: false, description: "Filter properties inside a polygon" })
  async findAll(
    @Query("format") format: string,
    @Query("polygon_id") polygonId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (format === "csv") {
      const csv = await this.propertiesService.findAllCsv(polygonId)
      res.set({
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=properties.csv",
      })
      res.send(csv)
      return
    }

    return this.propertiesService.findAll(polygonId)
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
