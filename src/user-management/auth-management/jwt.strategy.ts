import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../services/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {
    const JWT_SECRET = configService.get<string>('JWT_SECRET') || 'c9a0aafd532b567d77e4d75d91694a77435c8bfc0a19f9e80be772c79fecc6204aa98f5052ee685bc335ba04dbeabc589facd36afc35bdf9a10c35f8e60f5079';
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_SECRET,
    });
  }

  async validate(payload: any) {
    const user = await this.userService.findOne(payload.sub);
    const { password, ...result } = user.toJSON();

    return result;
  }
}
