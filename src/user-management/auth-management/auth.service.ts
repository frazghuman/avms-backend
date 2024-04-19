import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../services/user.service';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { RoleService } from '../services/role.service';

@Injectable()
export class AuthService {
  JWT_REFRESH_SECRET: string;
  constructor(
    private userService: UserService,
    private roleService: RoleService,
    private jwtService: JwtService,
    private configService: ConfigService
  ) {
    this.JWT_REFRESH_SECRET = this.configService.get('JWT_REFRESH_SECRET');

  }
  
  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userService.findOneByEmail(email);

    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user.toObject(); // remove password from user object
      return result;
    }

    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user._id };
    const access_token = await this.accessToken(user);
    const refresh_token = this.jwtService.sign(payload, {
      expiresIn: '7d', // set expiration time for refresh token
      secret: this.JWT_REFRESH_SECRET // use the refresh token secret
    });
    return {
      access_token,
      refresh_token
    };
  }

  async accessToken(user: any) {
    const role = await this.roleService.findOne(user.role);
    const payload = { email: user.email, sub: user._id, role: role.name, permissions: role.permissions };
    return this.jwtService.sign(payload);
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    // Verify the refresh token
    const decodedToken = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET);
    if (!decodedToken || typeof decodedToken === 'string') {
      throw new UnauthorizedException('Invalid refresh token');
    }
    
    // Check if the user exists
    const user = await this.userService.findOne(decodedToken.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
  
    // Generate a new access token
    const accessToken = await this.accessToken(user);;
  
    return { accessToken: accessToken };
  }

  
  logout() {
    // TODO
    return true;
  }
}
