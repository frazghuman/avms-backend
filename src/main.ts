import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const dotenv = require('dotenv');

async function bootstrap() {
  dotenv.config();
  const config = {
    mongoUri: process.env.MONGO_URI,
    port: process.env.PORT || 3000,
  };
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);

  
}
bootstrap();
