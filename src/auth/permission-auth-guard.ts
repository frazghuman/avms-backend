import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class PermissionAuthGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(private reflector: Reflector, private readonly configService: ConfigService) {
      super();
  }

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>('permissions', context.getHandler());
    if (!requiredPermissions) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return false;
    }

    const [, token] = authHeader.split(' ');
    try {
      const JWT_SECRET = this.configService.get<string>('JWT_SECRET') || 'c9a0aafd532b567d77e4d75d91694a77435c8bfc0a19f9e80be772c79fecc6204aa98f5052ee685bc335ba04dbeabc589facd36afc35bdf9a10c35f8e60f5079';
      const decoded = jwt.verify(token, JWT_SECRET);
      const permissions = decoded['permissions'] ?? [];
      const hasPermission = requiredPermissions.every(permission => permissions.includes(permission));
      return hasPermission;
    } catch (error) {
      return false;
    }

  }
}
