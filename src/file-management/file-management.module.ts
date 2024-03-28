import { BadRequestException, MiddlewareConsumer, Module, NestModule, RequestMethod, UnsupportedMediaTypeException } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { FileUploadController } from './file-upload.controller';
import { diskStorage } from 'multer';
import { ProjectFile, ProjectFileSchema } from './schemas/project-file.schema';
import { ProjectFileService } from './services/project-file.service';
import { ProjectServiceModule } from '../project-management/services/project-service.module';
import { DocsMiddleware, ExcelMiddleware } from '../middlewares/allowed-file-formats.middleware';
import * as path from 'path';
import { ExcelServiceModule } from './services/excel.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ProjectFile.name, schema: ProjectFileSchema }]),
    ProjectServiceModule,
    ExcelServiceModule,
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          // check if the file format is valid
          const [fileName, fileExtension] = getFileNameAndExtension(file.originalname);

          if (!req?.allowedFormats?.includes(fileExtension)) {
            const allowedFormats = req?.allowedFormats?.join(',');
            const message = `${allowedFormats ?? 'No any'} files are allowed`;
            cb(
              new UnsupportedMediaTypeException(message),
              false,
            )
            return;
          }
        
          // Generate filename and pass it to the callback
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, fileName + '-' + uniqueSuffix + '.' + fileExtension);
        },
      }),
      fileFilter: (req, file, cb) => {
        // check if the file format is valid
        const fileExtension = file.originalname.split('.').pop();

        if (!req?.allowedFormats?.includes(fileExtension)) {
          const allowedFormats = req?.allowedFormats?.join(',');
          const message = `${allowedFormats ?? 'No any'} files are allowed`;
          cb(
            new UnsupportedMediaTypeException(message),
            false,
          )
          return;
        }
        cb(null, true);
        
      },
    }),
  ],
  providers: [ProjectFileService],
  controllers: [FileUploadController],
  exports: [ProjectFileService]
})
export class FileManagementModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ExcelMiddleware).forRoutes({ path: 'file/upload/excel', method: RequestMethod.POST });
    consumer.apply(DocsMiddleware).forRoutes({ path: 'file/upload/docs', method: RequestMethod.POST });
    
  }
}

// Function to separate file name and extension
function getFileNameAndExtension(filePath: string): [string, string] {
  const fileName = path.basename(filePath, path.extname(filePath));
  const extension = path.extname(filePath).slice(1);

  return [fileName, extension];
}
