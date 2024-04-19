import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const MONGO_URI = configService.get<string>('MONGO_URI');
        console.log(MONGO_URI);
        return {
          uri: MONGO_URI
        };
      },
      inject: [ConfigService],
    })
  ],
})
export class DatabaseModule {
  static register() {
    return {
      module: DatabaseModule,
      providers: [],
      exports: [],
    };
  }
}
