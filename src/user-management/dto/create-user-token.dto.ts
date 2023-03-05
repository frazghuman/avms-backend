import { IsMongoId, IsString } from 'class-validator';

export class CreateUserTokenDto {
  @IsMongoId()
  user: string;

  @IsString()
  token: string;

  @IsString()
  expiresAt: Date;
}
