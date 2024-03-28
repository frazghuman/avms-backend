import { Injectable } from '@nestjs/common';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ExcelService {
  readExcelFile(filePath: string): any[] {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    return data;
  }

  readFileByName(fileName: string): {content: any, headers: string[]} {
    // Construct the full path. Be careful with this to avoid security risks like path traversal.
    const fullPath = path.resolve('uploads', fileName);

    const fileContent = fs.readFileSync(fullPath);

    const workbook = xlsx.read(fileContent);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // Read the file content and send it as the response
    const content = xlsx.utils.sheet_to_json(sheet);

    const headers = content.length ? Object.keys(content[0]) : [];

    return {content, headers};
  }

  fileExists(fileName: string) {
    // Construct the full path. Be careful with this to avoid security risks like path traversal.
    const fullPath = path.resolve('uploads', fileName);

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return false;
    }
    return true;
  }
}
