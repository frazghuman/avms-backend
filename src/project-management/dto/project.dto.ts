import { IsString, IsNotEmpty, IsDate, IsObject, ValidateNested, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class ContactPersonDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  designation: string;

  @IsNotEmpty()
  @IsString()
  email: string;

  @IsNotEmpty()
  @IsString()
  phoneNo: string;
}

export class ContractDto {
  @IsOptional()
  @IsString()
  refNo?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  refDetails?: string;

  @IsOptional()
  @IsString({ each: true })
  scopeOfWork?: string[];

  @IsOptional()
  @IsString()
  dataRequired?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  detail?: string;

  @IsOptional()
  @IsNumber()
  upfrontPercentage?: number;

  @IsOptional()
  @IsString()
  upfrontDetail?: string;

  @IsOptional()
  @IsString()
  customerSatisfactionMessage?: string;

  @IsOptional()
  @IsString()
  promisorInfoSignature?: string;

  @IsOptional()
  @IsString()
  promisorInfoName?: string;

  @IsOptional()
  @IsString()
  promisorInfoDesignation?: string;
}

export class ProjectDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsDate()
  valuationDate: Date;

  @IsNotEmpty()
  @IsString()
  valuationType: string;

  @IsNotEmpty()
  @IsString()
  stage: string;

  @IsNotEmpty()
  @IsString()
  company: string;

  @IsNotEmpty()
  @IsObject()
  @ValidateNested()
  @Type(() => ContactPersonDto)
  contactPerson: ContactPersonDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ContractDto)
  contract: ContractDto;

  @IsOptional()
  @IsObject()
  lastYearInfo: any;

  @IsOptional()
  @IsObject()
  requestedDataFiles: any;

  @IsOptional()
  @IsObject()
  receivedDataFiles: any;

  @IsOptional()
  @IsObject()
  compiledDataFiles: any;

  @IsOptional()
  @IsObject()
  assumptions: any;

  @IsOptional()
  @IsObject()
  benifitsStructure: any;
  
}
