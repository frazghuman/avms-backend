import { IsNotEmpty, IsString, IsNumber, IsOptional, IsDate, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePensionerEmployeeDataDto {
  @IsNotEmpty()
  @IsNumber()
  SNO: number;

  @IsNotEmpty()
  @IsNumber()
  ECODE: number;

  @IsNotEmpty()
  @IsString()
  NAME: string;

  @IsNotEmpty()
  @IsString()
  TYPE_OF_PENSIONER: string;

  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  DOB: Date;

  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  DOR: Date;

  @IsNotEmpty()
  @IsNumber()
  PENSION_AMOUNT: number;

  @IsOptional()
  @IsNumber()
  MEDICAL_ALLOWANCE?: number;

  @IsOptional()
  @IsNumber()
  ORDERLY_ALLOWANCE?: number;

  @IsNotEmpty()
  @IsNumber()
  AGE_AT_RETIREMENT_ADJ: number;

  @IsNotEmpty()
  @IsNumber()
  AGE: number;

  @IsNotEmpty()
  @IsNumber()
  YEARS_RESTORATION: number;

  @IsNotEmpty()
  @IsNumber()
  CURRENT_VALUE_OF_RESTORED_AMOUNT: number;

  @IsOptional()
  @IsMongoId()
  project?: string;

  @IsOptional()
  @IsString()
  projectStage?: string;
}

export class UpdatePensionerEmployeeDataDto {
  @IsOptional()
  @IsNumber()
  SNO?: number;

  @IsOptional()
  @IsNumber()
  ECODE?: number;

  @IsOptional()
  @IsString()
  NAME?: string;

  @IsOptional()
  @IsString()
  TYPE_OF_PENSIONER?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  DOB?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  DOR?: Date;

  @IsOptional()
  @IsNumber()
  PENSION_AMOUNT?: number;

  @IsOptional()
  @IsNumber()
  MEDICAL_ALLOWANCE?: number;

  @IsOptional()
  @IsNumber()
  ORDERLY_ALLOWANCE?: number;

  @IsOptional()
  @IsNumber()
  AGE_AT_RETIREMENT_ADJ?: number;

  @IsOptional()
  @IsNumber()
  AGE?: number;

  @IsOptional()
  @IsNumber()
  YEARS_RESTORATION?: number;

  @IsOptional()
  @IsNumber()
  CURRENT_VALUE_OF_RESTORED_AMOUNT?: number;

  @IsOptional()
  @IsMongoId()
  project?: string;

  @IsOptional()
  @IsString()
  projectStage?: string;
}
