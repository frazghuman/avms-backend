import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Project, ProjectSchema } from '../schemas/project.schema';
import { ProjectService } from './project.service';
import { DecrementRateModule } from '../../settings/decrement-rate.module';
import { GratuityCalculationsService } from './gratuity-calculations.service';
import { TaskServiceModule } from '../../file-management/services/task-service.module';
import { ProgressService } from '../../common/websocket/progress.gateway';

@Module({
    imports: [
      MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }]),
      DecrementRateModule,
      TaskServiceModule
    ],
    controllers: [],
    providers: [ProjectService, GratuityCalculationsService, ProgressService],
    exports: [ProjectService, GratuityCalculationsService, ProgressService],
  })
export class ProjectServiceModule {}
