import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TargetEntityDocument = TargetEntity & Document;

@Schema()
export class TargetEntity extends Document {
  @Prop({ required: true })
  name: string;

  @Prop()
  alias: string;
}

export const TargetEntitySchema = SchemaFactory.createForClass(TargetEntity);