import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';

const dotenv = require('dotenv');

async function bootstrap() {
  dotenv.config();
  const config = {
    mongoUri: process.env.MONGO_URI,
    port: process.env.PORT,
  };
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true,
  });

  // Increase the payload size limit (e.g., to 100MB)
  app.use(express.json({ limit: '100mb' }));

  await app.listen(config.port);

  
}
bootstrap();
