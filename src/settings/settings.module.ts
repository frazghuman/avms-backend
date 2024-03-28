import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DecrementRate, DecrementRateSchema } from './schemas/decrament-rate.schema';
import { DecrementRateController } from './controller/decrement-rate.controller';
import { DecrementRateService } from './services/decrement-rate.service';
import { DecrementRateModule } from './decrement-rate.module';

@Module({
    imports: [
        DecrementRateModule
      ],
    controllers: [DecrementRateController],
    providers: [],
})
export class SettingsModule {}
