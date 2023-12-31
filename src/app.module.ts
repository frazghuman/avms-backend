import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CompanyModule } from './company-management/company.module';
import { DatabaseModule } from './config/database.module';
import { FileManagementModule } from './file-management/file-management.module';
import { TodoModule } from './todo/todo.module';
import { UserModule } from './user-management/user.module';
import { ProjectModule } from './project-management/project.module';
import { CorsMiddleware } from './middlewares/cors.middleware';

@Module({
  imports: [
    DatabaseModule.register(),
    TodoModule,
    FileManagementModule,
    UserModule,
    CompanyModule,
    ProjectModule
  ],
  controllers: [
    AppController
  ],
  providers: [
    AppService
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorsMiddleware).forRoutes('*'); // Apply the middleware to all routes
  }
}
