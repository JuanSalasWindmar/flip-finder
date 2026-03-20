import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { PrismaModule } from "./prisma/prisma.module"
import { PolygonsModule } from "./polygons/polygons.module"
import { PropertiesModule } from "./properties/properties.module"
import { AppController } from "./app.controller"
import { AppService } from "./app.service"

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, PolygonsModule, PropertiesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
