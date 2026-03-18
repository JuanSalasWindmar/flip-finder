import { Controller, Get, Post, Patch, Delete, Param, Body } from "@nestjs/common"
import { PolygonsService } from "./polygons.service"
import { CreatePolygonDto } from "./dto/create-polygon.dto"
import { UpdatePolygonDto } from "./dto/update-polygon.dto"

@Controller("polygons")
export class PolygonsController {
  constructor(private readonly polygonsService: PolygonsService) {}

  @Post()
  create(@Body() dto: CreatePolygonDto) {
    return this.polygonsService.create(dto)
  }

  @Get()
  findAll() {
    return this.polygonsService.findAll()
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.polygonsService.findOne(id)
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdatePolygonDto) {
    return this.polygonsService.update(id, dto)
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.polygonsService.remove(id)
  }
}
