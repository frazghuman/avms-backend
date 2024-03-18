import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MortalityRateDocument = MortalityRate & Document;

@Schema()
export class MortalityRate {
  @Prop({ required: true })
  mortalityRateName: string;

  @Prop({ required: true, type: [{ type: Number }] })
  value: number[];

  @Prop({ required: true })
  order: number;
}

export const MortalityRateSchema = SchemaFactory.createForClass(MortalityRate);
