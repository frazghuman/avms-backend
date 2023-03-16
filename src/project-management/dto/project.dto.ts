import { IsDateString, IsOptional, IsString, IsArray, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { User } from '../../user-management/schemas/user.schema';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  startDate?: Date;

  @IsDateString()
  @IsOptional()
  endDate?: Date;

  @IsString()
  @IsOptional()
  status?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => User)
  teamMembers?: User[];

  @IsString()
  @IsOptional()
  budget?: string;

  @IsString()
  @IsOptional()
  company?: string;
}

export class UpdateProjectDto {
    @IsString()
    @IsNotEmpty()
    name: string;
  
    @IsString()
    @IsOptional()
    description?: string;
  
    @IsDateString()
    @IsOptional()
    startDate?: Date;
  
    @IsDateString()
    @IsOptional()
    endDate?: Date;
  
    @IsString()
    @IsOptional()
    status?: string;
  
    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => User)
    teamMembers?: User[];
  
    @IsString()
    @IsOptional()
    budget?: string;
  
    @IsString()
    @IsOptional()
    company?: string;
  }
