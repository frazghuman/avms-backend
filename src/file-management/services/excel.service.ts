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
  
    const dateKeys = ['DateofAppointmnet', 'DateofBirth'];
    return {content: this.convertExcelDates(content, dateKeys), headers};
  }

  convertExcelDates(data: any[], dateKeys: string[]): any[] {
    // Define the base date for Excel (Windows version)
    const baseDate = new Date(1899, 11, 30);

    // Iterate through each dataObject
    const converted = data.map(dataObject => {
        // Clone the dataObject object to avoid mutating the original data
        const cloneddataObject: any = { ...dataObject };

        // Iterate through each key that may contain a date
        dateKeys.forEach(key => {
            if (cloneddataObject[key]) {
                // Convert the Excel serial date number to a Date object
                const date = new Date(baseDate.getTime());
                date.setDate(date.getDate() + cloneddataObject[key]);

                // Format the Date object as a string and update the dataObject object
                // Adjust the date format as needed
                cloneddataObject[key] = date.toISOString().split('T')[0];
            }
        });

        return cloneddataObject;
    });

    return converted;
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
