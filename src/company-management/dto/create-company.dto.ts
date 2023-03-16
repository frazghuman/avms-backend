import { IsString, IsOptional, IsUrl, IsDateString, IsObject } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsString()
  industry: string;

  @IsDateString()
  founded: string;

  @IsString()
  headquarters: string;

  @IsString()
  size: string;

  @IsUrl()
  @IsOptional()
  website: string;

  @IsString()
  @IsOptional()
  email: string;

  @IsString()
  @IsOptional()
  phone: string;

  @IsObject()
  @IsOptional()
  socialMedia: Record<string, string>;

  @IsUrl()
  @IsOptional()
  logo: string;

  @IsUrl()
  @IsOptional()
  coverPhoto: string;
}
