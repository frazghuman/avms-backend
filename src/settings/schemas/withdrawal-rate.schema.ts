import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WithdrawalRateDocument = WithdrawalRate & Document;

@Schema()
export class WithdrawalRate {
  @Prop({ required: true })
  withdrawalRateName: string;

  @Prop({ required: true, type: [{ type: Number }] })
  value: number[];

  @Prop({ required: true })
  order: number;
}

export const WithdrawalRateSchema = SchemaFactory.createForClass(WithdrawalRate);
