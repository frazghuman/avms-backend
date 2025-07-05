import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import {formatDate} from './../utils/utils.functions';
import { ProjectFileService } from './services/project-file.service';
import { CreateProjectFileDto } from './dto/file-project.dto';
import { Request, Response } from 'express';
import { ExcelService } from './services/excel.service';
import { TaskService } from './services/task.service';
import { Types } from 'mongoose';
import { Task } from './schemas/task.schema';

@Controller('file')
export class FileUploadController {
  constructor(private projectFileService: ProjectFileService, private excelService: ExcelService, private readonly taskService: TaskService) {}

  @Post('upload/excel')
  @UseInterceptors(FileInterceptor('file'))
  async uploadExcelFile(@UploadedFile() file, @Req() req: Request, @Res() res: Response) {
    try {
      // Validate that file was uploaded
      if (!file) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: 'No file uploaded',
          message: 'Please select a file to upload'
        });
      }

      // Instead of relying solely on MIME type (which can be unreliable), 
      // also check file extension
      const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
      const allowedExtensions = ['xls', 'xlsx', 'xlsm', 'xlsb', 'xltx', 'xltm'];
      
      const allowedMimeTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel.sheet.macroEnabled.12',
        'application/octet-stream' // Sometimes Excel files are detected as this
      ];

      // Check both MIME type and file extension
      const isValidMimeType = allowedMimeTypes.includes(file.mimetype);
      const isValidExtension = allowedExtensions.includes(fileExtension);

      if (!isValidMimeType && !isValidExtension) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: 'Invalid file type',
          message: `Only Excel files (.xls, .xlsx, .xlsm) are allowed. Received: ${file.mimetype} with extension: ${fileExtension}`
        });
      }

      // Additional validation: If MIME type is octet-stream, ensure extension is valid
      if (file.mimetype === 'application/octet-stream' && !isValidExtension) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: 'Invalid file type',
          message: `File appears to be binary but doesn't have a valid Excel extension. Expected: ${allowedExtensions.join(', ')}, got: ${fileExtension}`
        });
      }

      // Validate file size (limit to 50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB in bytes
      if (file.size > maxSize) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: 'File too large',
          message: 'File size must be less than 50MB'
        });
      }

      // Send response back
      res.status(HttpStatus.OK).json({
        data: {
          filename: file.originalname,
          fileUrl: `/files/${file.filename}`,
        },
        message: 'File uploaded successfully'
      });
    } catch (error) {
      console.error('Error uploading Excel file:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Internal server error',
        message: 'An error occurred while uploading the file'
      });
    }
  }

  @Post('upload/docs')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocFile(@UploadedFile() file, @Req() req: Request, @Res() res: Response) {
    try {
      // Validate that file was uploaded
      if (!file) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: 'No file uploaded',
          message: 'Please select a file to upload'
        });
      }

      // Check both MIME type and file extension for document files
      const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
      const allowedExtensions = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
      
      const allowedMimeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/rtf',
        'application/octet-stream' // Sometimes documents are detected as this
      ];

      // Check both MIME type and file extension
      const isValidMimeType = allowedMimeTypes.includes(file.mimetype);
      const isValidExtension = allowedExtensions.includes(fileExtension);

      if (!isValidMimeType && !isValidExtension) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: 'Invalid file type',
          message: `Only document files (.pdf, .doc, .docx, .txt, .rtf) are allowed. Received: ${file.mimetype} with extension: ${fileExtension}`
        });
      }

      // Additional validation: If MIME type is octet-stream, ensure extension is valid
      if (file.mimetype === 'application/octet-stream' && !isValidExtension) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: 'Invalid file type',
          message: `File appears to be binary but doesn't have a valid document extension. Expected: ${allowedExtensions.join(', ')}, got: ${fileExtension}`
        });
      }

      // Validate file size (limit to 50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB in bytes
      if (file.size > maxSize) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: 'File too large',
          message: 'File size must be less than 50MB'
        });
      }

      // Send response back
      res.status(HttpStatus.OK).json({
        data: {
          filename: file.originalname,
          fileUrl: `/files/${file.filename}`,
        },
        message: 'File uploaded successfully'
      });
    } catch (error) {
      console.error('Error uploading document file:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Internal server error',
        message: 'An error occurred while uploading the file'
      });
    }
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file, @Body() body: any) {
    try {
      // Validate that file was uploaded
      if (!file) {
        return {
          error: 'No file uploaded',
          message: 'Please select a file to upload'
        };
      }

      const requestBody = JSON.parse(body.data);

      let createProjectFileDto: CreateProjectFileDto = new CreateProjectFileDto();
      createProjectFileDto['filename'] = file.filename;
      createProjectFileDto['originalname'] = file.originalname;
      createProjectFileDto['filePath'] = file.path;
      createProjectFileDto['mimetype'] = file.mimetype;
      createProjectFileDto['size'] = file.size;
      createProjectFileDto['uploadDate'] = new Date();
      
      if(requestBody?.project) {
        createProjectFileDto['project'] = requestBody?.project;
      }

      createProjectFileDto['md5'] = this.projectFileService.generateMD5(file.path);

      const filePath = file.path;
      const fileContent = fs.readFileSync(filePath);

      const workbook = xlsx.read(fileContent);
      const sheetName = workbook.SheetNames[0];
      createProjectFileDto['sheetName'] = sheetName;
      const worksheet = workbook.Sheets[sheetName];

      // Extract the header row as an array of strings
      const headerRow = [];
      const headerRowNo = requestBody?.headerRowIndex || 1;
      for (const cellAddress in worksheet) {
        const cell = worksheet[cellAddress];
        if (this.getNumberFromAlphaNumeric(cellAddress) === headerRowNo) {
          const columnName = this.getAlphabeticPartFromAlphaNumeric(cellAddress);
          const title = this.cleanString(cell.w);
          headerRow.push({ columnIndex: columnName, title: title});
        }
      }

      createProjectFileDto['headerRowNo'] = Number(headerRowNo);
      createProjectFileDto['headerRow'] = headerRow;
      await this.projectFileService.create(createProjectFileDto);

      return {
        headerRow: headerRow,
        message: 'File uploaded and parsed successfully',
      };
    } catch (error) {
      console.error('Error processing uploaded file:', error);
      return {
        error: 'Internal server error',
        message: 'An error occurred while processing the uploaded file',
        details: error.message
      };
    }
  }

  @Get('excel/:fileUrl')
  async readExcelFile(@Param('fileUrl') filePath: string, @Res() res: Response) {
    try {
      // Check if file exists
      if (!this.excelService.fileExists(filePath)) {
        return res.status(404).send('File not found');
      }
      return res.send(this.excelService.readFileByName(filePath));
    } catch (error) {
      console.error(error);
      return res.status(500).send('An error occurred');
    }
  }

  getNumberFromAlphaNumeric = (str: string): number => {
    const match = str.match(/\d+/); // Matches one or more digits in the string
    return match ? parseInt(match[0], 10) : 0; // Converts the matched digits to a number or returns 0 if no match found
  };

  getAlphabeticPartFromAlphaNumeric = (str: string): string => {
    return str.match(/[A-Za-z]+/)[0];
  };

  cleanString = (input: string): string => {
    const regex = /[\r\n]+/g;
    return input.replace(regex, ' ').replace(/\s+/g, ' ').trim();
  }

  @Post('processor/task')
  async fileProcessingaTask(
    @Body('filePath') filePath: string,
    @Body('fileType') fileType: string,
    @Body('project') project: Types.ObjectId, // Project ObjectId
    @Body('stage') stage: string,             // Stage string
  ): Promise<any> {
    const taskType: string = 'FILE_PROCESSING';
    const taskId = await this.taskService.taskProcessing(filePath, fileType, taskType, project, stage);
    return {data: taskId, message: `Task created with ID: ${taskId}`};
  }

  @Get('status/:taskId')
  async checkTaskStatus(@Param('taskId') taskId: string): Promise<string> {
    return this.taskService.checkTaskStatus(taskId);
  }

  @Get('/task/project/:projectId/stage/:stage')
  async getTasksByProjectAndStage(
    @Param('projectId') projectId: string, // Use string and convert to ObjectId in the service
    @Param('stage') stage: string,
  ): Promise<Task[]> {
    const objectId = new Types.ObjectId(projectId); // Convert the string to ObjectId
    return this.taskService.getTasksByProjectAndStage(objectId, stage);
  }

  @Get('/task/project/:projectId/taskType/:taskType')
  async getTasksByProjectAndTaskType(
    @Param('projectId') projectId: string, // Use string and convert to ObjectId in the service
    @Param('taskType') taskType: string,
  ): Promise<Task[]> {
    const objectId = new Types.ObjectId(projectId); // Convert the string to ObjectId
    return this.taskService.getTasksByProjectAndStage(objectId, taskType);
  }

  @Delete('/task/project/:projectId/stage/:stage/fileType/:fileType')
  async deleteTasks(
    @Param('projectId') projectId: string,
    @Param('stage') stage: string,
    @Param('fileType') fileType: string
  ): Promise<{ deletedCount: number }> {
    const objectId = new Types.ObjectId(projectId);
    return this.taskService.deleteTasksByProjectStageAndFileType(objectId, stage, fileType);
  }

}
