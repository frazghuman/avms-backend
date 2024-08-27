import { Module } from '@nestjs/common';
import { TaskService } from './task.service';
import { MongooseModule } from '@nestjs/mongoose';
import { TaskSchema } from '../schemas/task.schema';
import { ExcelServiceModule } from './excel.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Task', schema: TaskSchema }]),
    ExcelServiceModule
  ],
  controllers: [],
  providers: [TaskService],
  exports: [TaskService, ExcelServiceModule, MongooseModule],
})
export class TaskServiceModule {}
