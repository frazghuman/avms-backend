import { Module } from '@nestjs/common';
import { ExcelService } from './excel.service';

@Module({
    imports: [
    ],
    controllers: [],
    providers: [ExcelService],
    exports: [ExcelService],
  })
export class ExcelServiceModule {}
