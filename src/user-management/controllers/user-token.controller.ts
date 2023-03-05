import { Body, Controller, Post } from '@nestjs/common';
import { UserTokenService } from '../services/user-token.service';
import { CreateUserTokenDto } from '../dto/create-user-token.dto';

@Controller('user-tokens')
export class UserTokenController {
  constructor(private readonly userTokenService: UserTokenService) {}

  @Post()
  create(@Body() createUserTokenDto: CreateUserTokenDto) {
    return this.userTokenService.create(createUserTokenDto);
  }
}
