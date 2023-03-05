import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserToken, UserTokenDocument } from '../schemas/user-token.schema';
import { CreateUserTokenDto } from '../dto/create-user-token.dto';

@Injectable()
export class UserTokenService {
  constructor(
    @InjectModel(UserToken.name)
    private readonly userTokenModel: Model<UserTokenDocument>,
  ) {}

  async create(createUserTokenDto: CreateUserTokenDto): Promise<UserToken> {
    const createdToken = new this.userTokenModel(createUserTokenDto);
    return createdToken.save();
  }
}
