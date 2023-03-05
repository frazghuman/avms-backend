import { Module } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { JoiValidationPipe } from './joi-validation.pipe';

@Module({
  imports: [
  ],
  controllers: [
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: JoiValidationPipe,
    },
  ],
})
export class PipeModule {}
