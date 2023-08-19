import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { HeaderColumnTitle } from '../interfaces/header-column-title.interface';

export class CreateProjectFileDto {
  @IsString()
  filename: string;

  @IsString()
  originalname: string;

  @IsString()
  filePath: string;

  @IsString()
  mimetype: string;

  @IsNumber()
  size: number;

  @IsOptional()
  @IsString()
  sheetName?: string;

  @IsOptional()
  @IsNumber()
  headerRowNo?: number;

  @IsOptional()
  @IsString({ each: true })
  headerRow: HeaderColumnTitle[];

  @IsDateString()
  uploadDate: Date;

  @IsOptional()
  @IsString({ each: true })
  aliases: string[];

  @IsOptional()
  @IsString()
  project: string;

  @IsString()
  md5: string;
}
