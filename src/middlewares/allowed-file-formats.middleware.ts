// excel.middleware.ts
import { NestMiddleware, Injectable } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ExcelMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
      // Set allowed Excel formats
      const allowedFormats = req?.['allowedFormats'] ?? [];
      req['allowedFormats'] = [...allowedFormats, 'xls', 'xlsx', 'xlsm', 'xlsb', 'xltx', 'xltm'];
      
      next();
    };
}

@Injectable()
export class DocsMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
      // Set allowed Excel formats
      const allowedFormats = req?.['allowedFormats'] ?? [];
      req['allowedFormats'] = [...allowedFormats, 'pdf', 'doc', 'docx', 'txt', 'rtf'];
      
      next();
    };
}
