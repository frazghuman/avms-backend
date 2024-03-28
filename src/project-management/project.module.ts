import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UserServiceModule } from '../user-management/services/user-service.module';
import { ProjectController } from './controller/project.controller';
import { TargetEntityController } from './controller/target-entity.controller';
import { TargetProjectController } from './controller/target-project.controller';
import { TargetEntity, TargetEntitySchema } from './schemas/target-entity.schema';
import { TargetProject, TargetProjectSchema } from './schemas/target-project.schema';
import { ProjectServiceModule } from './services/project-service.module';
import { TargetEntityService } from './services/target-entity.service';
import { TargetProjectService } from './services/target-project.service';
import { ExcelServiceModule } from '../file-management/services/excel.module';

@Module({
    imports: [
      MongooseModule.forFeature([{ name: TargetEntity.name, schema: TargetEntitySchema }]),
      MongooseModule.forFeature([{ name: TargetProject.name, schema: TargetProjectSchema }]),
      UserServiceModule,
      ProjectServiceModule
    ],
    controllers: [ProjectController, TargetEntityController, TargetProjectController],
    providers: [TargetEntityService, TargetProjectService, ConfigService],
    exports: [TargetEntityService, TargetProjectService],
  })
export class ProjectModule {}
