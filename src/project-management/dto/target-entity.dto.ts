import { IsNotEmpty } from 'class-validator';

export class CreateTargetEntityDto {
  @IsNotEmpty()
  name: string;
}

export class UpdateTargetEntityDto {
  @IsNotEmpty()
  name: string;
}
