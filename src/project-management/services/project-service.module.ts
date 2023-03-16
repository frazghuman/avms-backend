import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Project, ProjectSchema } from '../schemas/project.schema';
import { ProjectService } from './project.service';

@Module({
    imports: [
      MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }]),
    ],
    controllers: [],
    providers: [ProjectService],
    exports: [ProjectService],
  })
export class ProjectServiceModule {}
