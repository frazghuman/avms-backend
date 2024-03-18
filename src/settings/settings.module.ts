import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MortalityRateController } from './controller/mortality-rate.controller';
import { MortalityRateService } from './services/mortality-rate.service';
import { MortalityRate, MortalityRateSchema } from './schemas/mortality-rate.schema';
import { WithdrawalRateController } from './controller/withdrawal-rate.controller';
import { WithdrawalRateService } from './services/withdrawal-rate.service';
import { WithdrawalRate, WithdrawalRateSchema } from './schemas/withdrawal-rate.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
          { name: MortalityRate.name, schema: MortalityRateSchema },
          { name: WithdrawalRate.name, schema: WithdrawalRateSchema },
        ]),
      ],
    controllers: [MortalityRateController, WithdrawalRateController],
    providers: [MortalityRateService, WithdrawalRateService],
})
export class SettingsModule {}
