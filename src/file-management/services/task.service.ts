import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ExcelService } from './excel.service';
import { Task } from '../schemas/task.schema';
import { ProgressService } from '../../common/websocket/progress.gateway';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TaskService {
  constructor(
    @InjectModel('Task') private readonly taskModel: Model<Task>,
    private readonly excelService: ExcelService,
    private readonly progressService: ProgressService
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
  ): Promise<{ taskId: string; jobId: string }> {
    const taskId = Math.random().toString(36).substring(7);
    const jobId = uuidv4(); // Generate unique job ID for progress tracking
    
    const newTask = new this.taskModel({
      id: taskId,
      status: 'NOT_STARTED',
      filePath,
      fileType,
      taskType,
      project,               // Save the project ObjectId
      stage,                 // Save the stage string
      jobId,                 // Store job ID for progress tracking
    });
    
    try {
      await newTask.save();
      
      // Initialize progress tracking
      this.progressService.updateProgress(
        jobId,
        'initialization',
        0,
        100,
        'Initializing file processing...',
        { 
          taskType: 'FILE_PROCESSING',
          fileType,
          status: 'INITIALIZING'
        }
      );
      
      // Start the background task
      this.runTask(taskId, fileType, project, stage, jobId);
    } catch (error) {
      console.log('CREATE_TASK_ERROR: ', error);
    }
    
    return { taskId, jobId };
  }

  private async runTask(taskId: string, fileType: string, project: Types.ObjectId, projectStage: string, jobId: string): Promise<void> {
    const task = await this.taskModel.findOne({ id: taskId });
    if (task) {
      task.status = 'IN_PROGRESS';
      task.updatedAt = new Date();
      await task.save();

      // Update progress to in-progress
      this.progressService.updateProgress(
        jobId,
        'processing',
        5,
        100,
        'Starting file processing...',
        { 
          taskType: 'FILE_PROCESSING',
          fileType,
          status: 'IN_PROGRESS'
        }
      );

      try {
        await this.excelService.processExcelFile(task.filePath, fileType, project, projectStage, jobId);
        task.status = 'COMPLETED';
        
        // Final success update
        this.progressService.updateProgress(
          jobId,
          'completed',
          100,
          100,
          'File processing completed successfully!',
          { 
            taskType: 'FILE_PROCESSING',
            fileType,
            status: 'COMPLETED',
            completed: true
          }
        );
      } catch (error) {
        task.descriptionType = 'ERROR';
        task.description = error.message;
        task.stacktrace = error.stack;
        task.status = 'FAILED';
        
        // Error update
        this.progressService.updateProgress(
          jobId,
          'error',
          0,
          100,
          `File processing failed: ${error.message}`,
          { 
            taskType: 'FILE_PROCESSING',
            fileType,
            status: 'FAILED',
            error: true,
            completed: true
          }
        );
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
