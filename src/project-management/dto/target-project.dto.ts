import { IsString, IsNotEmpty, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTargetEntityDto, UpdateTargetEntityDto } from './target-entity.dto';

export class CreateTargetProjectDto {
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTargetEntityDto)
  targetEntities: CreateTargetEntityDto[];

  @IsNotEmpty()
  @IsString()
  project: string;

  @IsNotEmpty()
  @IsString()
  file: string;

  @IsOptional()
  @IsArray()
  @Type(() => Object)
  fileData?: any[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  teamMembers?: string[];
}

export class UpdateTargetProjectDto {
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UpdateTargetEntityDto)
    targetEntities?: UpdateTargetEntityDto[];
  
    @IsOptional()
    @IsString()
    project?: string;
  
    @IsOptional()
    @IsString()
    filepath?: string;
  
    @IsOptional()
    @IsArray()
    @Type(() => Object)
    fileData?: any[];
  
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    teamMembers?: string[];
  }
