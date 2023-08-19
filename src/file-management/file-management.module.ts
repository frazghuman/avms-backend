import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { FileUploadController } from './file-upload.controller';
import { diskStorage } from 'multer';
import { ProjectFile, ProjectFileSchema } from './schemas/project-file.schema';
import { ProjectFileService } from './services/project-file.service';
import { ProjectServiceModule } from '../project-management/services/project-service.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ProjectFile.name, schema: ProjectFileSchema }]),
    ProjectServiceModule,
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          // Validate file format here
          if (!file.originalname.match(/\.(xls|xlsx|xlsm|xlsb|xltx|xltm|wav)$/)) {
            return cb(new Error('Invalid file format'));
          }
        
          // Generate filename and pass it to the callback
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
        },
      }),
      fileFilter: (req, file, cb) => {
        // check if the file format is valid
        if (!file.originalname.match(/\.(xls|xlsx|xlsm|xlsb|xltx|xltm|wav)$/)) {
          return cb(new Error('Only Excel files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  ],
  providers: [ProjectFileService],
  controllers: [FileUploadController],
  exports: [ProjectFileService]
})
export class FileManagementModule {}
