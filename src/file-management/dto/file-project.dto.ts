import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';

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
  @IsString({ each: true })
  headerRow: string[];

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
