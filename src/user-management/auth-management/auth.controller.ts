import { Body, Controller, Post, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    if (!user || loginDto.password.length <= 0) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.verified) {
      throw new UnauthorizedException('Unverified User');
    }
    const accessToken = await this.authService.login(user);
    return { accessToken };
  }

  @Post('refresh-token')
  @UseGuards(AuthGuard('jwt'))
  async refreshToken(@Request() req) {
    return this.authService.refreshToken(req.body.user);
  }

  @Post('logout')
  async logout() {
    await this.authService.logout();
    return { message: 'logout successful' };
  }
  
}
