import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DecrementRateDocument = DecrementRate & Document;

@Schema()
export class DecrementRate {
  @Prop({ required: true })
  decrementRateName: string;

  @Prop({ required: true, type: [{ type: Number }] })
  value: number[];

  @Prop({ required: true })
  order: number;

  @Prop({ required: true })
  rateType: string;
  
  @Prop({ required: true })
  startingAge: number;
}

export const DecrementRateSchema = SchemaFactory.createForClass(DecrementRate);
