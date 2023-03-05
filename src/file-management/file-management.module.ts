import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { FileUploadController } from './file-upload.controller';
import { diskStorage } from 'multer';

@Module({
  imports: [
    // MongooseModule.forFeature([{ name: Todo.name, schema: TodoSchema }]),
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          // Validate file format here
          if (!file.originalname.match(/\.(xls|xlsx|xlsm|xltx|xltm)$/)) {
            return cb(new Error('Invalid file format'));
          }
        
          // Generate filename and pass it to the callback
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
        },
      }),
      fileFilter: (req, file, cb) => {
        // check if the file format is valid
        if (!file.originalname.match(/\.(xls|xlsx|xlsm|xltx|xltm)$/)) {
          return cb(new Error('Only Excel files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  ],
  providers: [],
  controllers: [FileUploadController],
})
export class FileManagementModule {}
