import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './config/database.module';
import { FileManagementModule } from './file-management/file-management.module';
import { TodoModule } from './todo/todo.module';
import { UserModule } from './user-management/user.module';

@Module({
  imports: [
    DatabaseModule.register(),
    TodoModule,
    FileManagementModule,
    UserModule
  ],
  controllers: [
    AppController
  ],
  providers: [
    AppService
  ],
})
export class AppModule {}
