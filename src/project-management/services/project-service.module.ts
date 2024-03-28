import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Project, ProjectSchema } from '../schemas/project.schema';
import { ProjectService } from './project.service';
import { DecrementRateModule } from '../../settings/decrement-rate.module';
import { ExcelServiceModule } from '../../file-management/services/excel.module';
import { GratuityCalculationsService } from './gratuity-calculations.service';

@Module({
    imports: [
      MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }]),
      DecrementRateModule,
      ExcelServiceModule
    ],
    controllers: [],
    providers: [ProjectService, GratuityCalculationsService],
    exports: [ProjectService, GratuityCalculationsService],
  })
export class ProjectServiceModule {}
