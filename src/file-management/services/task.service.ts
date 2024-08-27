import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ExcelService } from './excel.service';
import { Task } from '../schemas/task.schema';

@Injectable()
export class TaskService {
  constructor(
    @InjectModel('Task') private readonly taskModel: Model<Task>,
    private readonly excelService: ExcelService
  ) {}

  async fileProcessingTask(
    filePath: string,
    fileType: string,
    project: Types.ObjectId, // Project ObjectId
    stage: string,           // Stage string
  ): Promise<string> {
    const taskId = Math.random().toString(36).substring(7);
    const newTask = new this.taskModel({
      id: taskId,
      status: 'NOT_STARTED',
      filePath,
      fileType,
      taskType: "FILE_PROCESSING",
      project,               // Save the project ObjectId
      stage,                 // Save the stage string
    });
    try {
      await newTask.save();
      this.runTask(taskId, fileType, project);
    } catch (error) {
      console.log('CREATE_TASK_ERROR: ', error);
    }
    return taskId;
  }

  private async runTask(taskId: string, fileType: string, project: Types.ObjectId): Promise<void> {
    const task = await this.taskModel.findOne({ id: taskId });
    if (task) {
      task.status = 'IN_PROGRESS';
      task.updatedAt = new Date();
      await task.save();

      try {
        await this.excelService.processExcelFile(task.filePath, fileType, project);
        task.status = 'COMPLETED';
      } catch (error) {
        task.descriptionType = 'ERROR';
        task.description = error.message;
        task.stacktrace = error.stack;
        task.status = 'FAILED';
      }

      task.updatedAt = new Date();
      await task.save();
    }
  }

  async checkTaskStatus(taskId: string): Promise<string> {
    const task = await this.taskModel.findOne({ id: taskId });
    return task ? task.status : 'NOT_STARTED';
  }

  // New method to get tasks by project and stage, returning the last record for each fileType
  async getTasksByProjectAndStage(projectId: Types.ObjectId, stage: string): Promise<Task[]> {
    return this.taskModel.aggregate([
      { $match: { project: projectId, stage, fileType: { $exists: true } } }, // Match records by project, stage, and ensure fileType exists
      {
        $sort: { createdAt: -1 } // Sort by creation date, descending (newest first)
      },
      {
        $group: {
          _id: "$fileType", // Group by fileType
          lastRecord: { $first: "$$ROOT" } // Get the first record in each group, which is the last record because of the sort
        }
      },
      {
        $replaceRoot: { newRoot: "$lastRecord" } // Replace the root document with the lastRecord
      }
    ]).exec();
  }

  // Method to delete all records by projectId, stage, and fileType
  async deleteTasksByProjectStageAndFileType(
    projectId: Types.ObjectId,
    stage: string,
    fileType: string
  ): Promise<{ deletedCount: number }> {
    const result = await this.taskModel.deleteMany({
      project: projectId,
      stage,
      fileType
    }).exec();

    return { deletedCount: result.deletedCount };
  }

}
