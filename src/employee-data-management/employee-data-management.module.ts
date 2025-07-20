import { Module } from '@nestjs/common';
import { ExcelServiceModule } from '../file-management/services/excel.module';
import { ActiveEmployeeDataController } from './controllers/active-employee-data.controller';
import { PensionerEmployeeDataController } from './controllers/pensioner-employee-data.controller';
import { ActiveEmployeeDataService } from './services/active-employee-data.service';
import { PensionerEmployeeDataService } from './services/pensioner-employee-data.service';

@Module({
  imports: [
    ExcelServiceModule // Import the existing module that already registers the models
  ],
  controllers: [
    ActiveEmployeeDataController,
    PensionerEmployeeDataController
  ],
  providers: [
    ActiveEmployeeDataService,
    PensionerEmployeeDataService
  ],
  exports: [
    ActiveEmployeeDataService,
    PensionerEmployeeDataService
  ]
})
export class EmployeeDataManagementModule {}
