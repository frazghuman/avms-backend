import { IsNotEmpty, IsString, IsNumber, IsOptional, IsDate, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateActiveEmployeeDataDto {
  @IsNotEmpty()
  @IsNumber()
  SNO: number;

  @IsNotEmpty()
  @IsString()
  ECODE: string;

  @IsNotEmpty()
  @IsString()
  NAME: string;

  @IsNotEmpty()
  @IsString()
  PAY_SCALE: string;

  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  DOA: Date;

  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  DOB: Date;

  @IsNotEmpty()
  @IsNumber()
  PAY: number;

  @IsNotEmpty()
  @IsNumber()
  AGE: number;

  @IsNotEmpty()
  @IsString()
  PS: string;

  @IsOptional()
  @IsNumber()
  ORDERLY_ALLOWANCE?: number;

  @IsOptional()
  @IsMongoId()
  project?: string;

  @IsOptional()
  @IsString()
  projectStage?: string;
}

export class UpdateActiveEmployeeDataDto {
  @IsOptional()
  @IsNumber()
  SNO?: number;

  @IsOptional()
  @IsString()
  ECODE?: string;

  @IsOptional()
  @IsString()
  NAME?: string;

  @IsOptional()
  @IsString()
  PAY_SCALE?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  DOA?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  DOB?: Date;

  @IsOptional()
  @IsNumber()
  PAY?: number;

  @IsOptional()
  @IsNumber()
  AGE?: number;

  @IsOptional()
  @IsString()
  PS?: string;

  @IsOptional()
  @IsNumber()
  ORDERLY_ALLOWANCE?: number;

  @IsOptional()
  @IsMongoId()
  project?: string;

  @IsOptional()
  @IsString()
  projectStage?: string;
}
