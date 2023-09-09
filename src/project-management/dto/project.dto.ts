
import { IsString, IsNotEmpty, IsDate } from 'class-validator';

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
}
