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

  async createTask(
    filePath: string,
    fileType: string,
    taskType: string,
    project: Types.ObjectId, // Project ObjectId
    stage: string,           // Stage string
  ): Promise<string> {
    const taskId = Math.random().toString(36).substring(7);
    const newTask = new this.taskModel({
      id: taskId,
      status: 'NOT_STARTED',
      filePath,
      fileType,
      taskType,
      project,               // Save the project ObjectId
      stage,                 // Save the stage string
    });
    try {
      await newTask.save();
    } catch (error) {
      console.log('CREATE_TASK_ERROR: ', error);
    }
    return taskId;
  }

  async updateTask(taskId: string, updateData: Record<string, any>): Promise<void> {
    try {
      // Find the task by the custom "id" field and update it with the provided data
      await this.taskModel.findOneAndUpdate({ id: taskId }, updateData, { new: true });
    } catch (error) {
      console.log('UPDATE_TASK_ERROR: ', error);
    }
  }

  async updateTaskStatus(taskId: string, status: string): Promise<void> {
    try {
      // Use the generic updateTask function to update the status field
      await this.updateTask(taskId, { status });
    } catch (error) {
      console.log('UPDATE_TASK_STATUS_ERROR: ', error);
    }
  }  

  async taskProcessing(
    filePath: string,
    fileType: string,
    taskType: string,
    project: Types.ObjectId, // Project ObjectId
    stage: string,           // Stage string
  ): Promise<string> {
    const taskId = Math.random().toString(36).substring(7);
    const newTask = new this.taskModel({
      id: taskId,
      status: 'NOT_STARTED',
      filePath,
      fileType,
      taskType,
      project,               // Save the project ObjectId
      stage,                 // Save the stage string
    });
    try {
      await newTask.save();
      this.runTask(taskId, fileType, project, stage);
    } catch (error) {
      console.log('CREATE_TASK_ERROR: ', error);
    }
    return taskId;
  }

  private async runTask(taskId: string, fileType: string, project: Types.ObjectId, projectStage: string): Promise<void> {
    const task = await this.taskModel.findOne({ id: taskId });
    if (task) {
      task.status = 'IN_PROGRESS';
      task.updatedAt = new Date();
      await task.save();

      try {
        await this.excelService.processExcelFile(task.filePath, fileType, project, projectStage);
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
  async getTasksByProject(projectId: Types.ObjectId): Promise<Task[]> {
    return this.taskModel.aggregate([
      { $match: { project: projectId } }, // Match records by project, stages list, and ensure fileType exists
    ]).exec();
  }

  // New method to get tasks by project and stage, returning the last record for each fileType
  async getTasksByProjectAndStage(projectId: Types.ObjectId, stages: string): Promise<Task[]> {
    const stageList = stages.split(',').map(stage => stage.trim()); // Split stages by comma and trim any whitespace

    return this.taskModel.aggregate([
      { $match: { project: projectId, stage: { $in: stageList }, fileType: { $exists: true } } }, // Match records by project, stages list, and ensure fileType exists
      { $sort: { createdAt: -1 } }, // Sort by creation date, descending (newest first)
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

  async getTasksByProjectAndTaskType(projectId: string, taskType: string): Promise<Task[]> {
    return await this.taskModel.find({ project: projectId, taskType: taskType }).exec();
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
