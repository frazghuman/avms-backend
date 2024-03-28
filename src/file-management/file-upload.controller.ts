import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
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

@Controller('file')
export class FileUploadController {
  constructor(private projectFileService: ProjectFileService, private excelService: ExcelService) {}

  @Post('upload/excel')
  @UseInterceptors(FileInterceptor('file'))
  async uploadExcelFile(@UploadedFile() file, @Req() req: Request, @Res() res: Response) {
    // Send response back
    res.status(HttpStatus.OK).json({
      data: {
        filename: file.originalname,
        fileUrl: `/files/${file.filename}`,
      },
      message: 'File uploaded successfully'
    });
  }

  @Post('upload/docs')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocFile(@UploadedFile() file, @Req() req: Request, @Res() res: Response) {
    // Send response back
    res.status(HttpStatus.OK).json({
      data: {
        filename: file.originalname,
        fileUrl: `/files/${file.filename}`,
      },
      message: 'File uploaded successfully'
    });
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file, @Body() body: any) {
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
    /* const data = xlsx.utils.sheet_to_json(worksheet, {
      header: requestBody?.headerIndex || 0,
      defval: '',
      blankrows: false,
    });

    const mapping = requestBody?.mapping || {
      'First Name': 'firstName',
      'Last Name': 'lastName',
      'Email': 'email',
      'Phone Number': 'phoneNumber',
    };
    const mappedData = data.map(obj => {
      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [mapping[key], value])
      );
    });*/
    // Save the mapped data to the database

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
}
