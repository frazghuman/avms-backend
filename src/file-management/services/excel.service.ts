import { Injectable } from '@nestjs/common';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PensionerEmployeeData } from '../schemas/pensioner-employee-data.schema';
import { ActiveEmployeeData } from '../schemas/active-employee-data.schema';
import * as moment from 'moment';

@Injectable()
export class ExcelService {
  constructor(
    @InjectModel('PensionerEmployeeData') private readonly pensionerEmployeeModel: Model<PensionerEmployeeData>,
    @InjectModel('ActiveEmployeeData') private readonly activeEmployeeModel: Model<ActiveEmployeeData>,
  ) {}

  async processExcelFile(filePath: string, fileType: string, project: Types.ObjectId): Promise<void> {
    const fileName = path.basename(filePath);
    const fullPath = path.resolve('uploads', fileName);
    const workbook = xlsx.readFile(fullPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);
    const objectId = new Types.ObjectId(project);

    switch (fileType) {
      case 'PENSIONER_EMPLOYEE_DATA':
        await this.pensionerEmployeeModel.deleteMany({ project: objectId }).exec();
        for (const data of jsonData) {
          const cleanedData: any = data;
          // Convert Excel serial dates to JavaScript Dates
          cleanedData.DOB = this.parseDateOrSerial(cleanedData.DOB);
          cleanedData.DOR = this.parseDateOrSerial(cleanedData.DOR);

          // Convert project string ID to ObjectId if it's not already
          if (cleanedData.project && typeof cleanedData.project === 'string') {
            cleanedData.project = new Types.ObjectId(cleanedData.project);
          }

          const newRecord = new this.pensionerEmployeeModel({...cleanedData, project});
          await newRecord.save();
        }
        break;
      case 'ACTIVE_EMPLOYEE_DATA':
        await this.activeEmployeeModel.deleteMany({ project: objectId }).exec();
        for (const data of jsonData) {
          const cleanedData: any = data;
          // Convert Excel serial dates to JavaScript Dates
          cleanedData.DOA = this.parseDateOrSerial(cleanedData.DOA);
          cleanedData.DOB = this.parseDateOrSerial(cleanedData.DOB);

          // Convert project string ID to ObjectId if it's not already
          if (cleanedData.project && typeof cleanedData.project === 'string') {
            cleanedData.project = new Types.ObjectId(cleanedData.project);
          }

          const newRecord = new this.activeEmployeeModel({...cleanedData, project});
          await newRecord.save();
        }
        break;
      default:
        throw new Error('Unsupported file type');
    }
  }

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

  private parseDateOrSerial(dateValue: any): Date {
    if (typeof dateValue === 'number') {
      // If it's a number, treat it as an Excel serial date
      return this.convertExcelSerialDateToJSDate(dateValue);
    } else if (typeof dateValue === 'string') {
      // If it's a string, try to parse it with moment
      return this.parseDateString(dateValue);
    } else {
      throw new Error('Unsupported date format');
    }
  }

  private parseDateString(dateString: string): Date {
    const formats = ['DD-MM-YYYY', 'DD/MM/YYYY'];

    // Parse the date using moment
    const parsedDate = moment(dateString, formats, true);

    if (!parsedDate.isValid()) {
      throw new Error(`Invalid date format: ${dateString}`);
    }

    return parsedDate.toDate();
  }

  private convertExcelSerialDateToJSDate(serialDate: number): Date {
    const baseDate = moment('1899-12-30'); // Base date for Excel on Windows
    return baseDate.add(serialDate, 'days').toDate();
  }
}
