import { Module } from '@nestjs/common';
import { ExcelService } from './excel.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ActiveEmployeeDataSchema } from '../schemas/active-employee-data.schema';
import { PensionerEmployeeDataSchema } from '../schemas/pensioner-employee-data.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'PensionerEmployeeData', schema: PensionerEmployeeDataSchema }]),
    MongooseModule.forFeature([{ name: 'ActiveEmployeeData', schema: ActiveEmployeeDataSchema }]),
  ],
  providers: [ExcelService],
  exports: [ExcelService, MongooseModule],  // Export ExcelService to make it available in other modules
})
export class ExcelServiceModule {}
