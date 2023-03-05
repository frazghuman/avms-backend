import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as xlsx from 'xlsx';
import * as fs from 'fs';

@Controller('file')
export class FileUploadController {
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file, @Body() body: any) {

    const requestBody = JSON.parse(body.data);

    const filePath = file.path;
    const fileContent = fs.readFileSync(filePath);

    const workbook = xlsx.read(fileContent);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(worksheet, {
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
    });
    // Save the mapped data to the database
    return {
      mappedData: mappedData,
      message: 'File uploaded and parsed successfully',
    };
  }
}
