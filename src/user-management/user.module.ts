import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './controllers/user.controller';
import { Role, RoleSchema } from './schemas/role.schema';
import { UserToken, UserTokenSchema } from './schemas/user-token.schema';
import { RoleService } from './services/role.service';
import { RoleController } from './controllers/role.controller';
import { UserTokenService } from './services/user-token.service';
import { UserTokenController } from './controllers/user-token.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth-management/auth.service';
import { AuthController } from './auth-management/auth.controller';
import { JwtStrategy } from './auth-management/jwt.strategy';
import { UserServiceModule } from './services/user-service.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
      { name: UserToken.name, schema: UserTokenSchema },
    ]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'c9a0aafd532b567d77e4d75d91694a77435c8bfc0a19f9e80be772c79fecc6204aa98f5052ee685bc335ba04dbeabc589facd36afc35bdf9a10c35f8e60f5079',
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
    UserServiceModule
  ],
  controllers: [UserController, RoleController, UserTokenController, AuthController],
  providers: [
    RoleService,
    UserTokenService,
    AuthService,
    JwtStrategy,
    ConfigService, // Add the ConfigService as a provider
  ],
  exports: [JwtStrategy, PassportModule],
})
export class UserModule {}