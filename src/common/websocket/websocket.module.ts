import { Module } from '@nestjs/common';
import { ProgressService } from './progress.gateway';
import { ProgressController } from './progress.controller';

@Module({
  providers: [ProgressService],
  controllers: [ProgressController],
  exports: [ProgressService],
})
export class WebSocketModule {}
