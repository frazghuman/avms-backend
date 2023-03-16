import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CompanyController } from './controller/company.controller';
import { CompanyService } from './services/company.service';
import { Company, CompanySchema } from './schemas/company.schema';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Company.name, schema: CompanySchema }]),
  ],
  controllers: [CompanyController],
  providers: [CompanyService, ConfigService],
  exports: [CompanyService],
})
export class CompanyModule {}
