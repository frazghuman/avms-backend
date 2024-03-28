import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DecrementRate, DecrementRateSchema } from './schemas/decrament-rate.schema';
import { DecrementRateService } from './services/decrement-rate.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: DecrementRate.name, schema: DecrementRateSchema },
        ]),
    ],
    controllers: [],
    providers: [DecrementRateService],
    exports: [DecrementRateService],
  })
export class DecrementRateModule {}
