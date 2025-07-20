import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ActiveEmployeeDataDocument = ActiveEmployeeData & Document;

@Schema({ collection: 'activeemployeedatas', timestamps: true })
export class ActiveEmployeeData extends Document {
  @Prop({ required: true })
  SNO: number;

  @Prop({ required: true })
  ECODE: string;

  @Prop({ required: true })
  NAME: string;

  @Prop({ required: true })
  PAY_SCALE: string;

  @Prop({ required: true })
  DOA: Date;

  @Prop({ required: true })
  DOB: Date;

  @Prop({ required: true })
  PAY: number;

  @Prop({ required: true })
  AGE: number;

  @Prop({ required: true })
  PS: string;

  @Prop({ required: false, default: 0 })
  ORDERLY_ALLOWANCE: number;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: false })
  project: Types.ObjectId;

  @Prop({ required: false })
  projectStage: string;
}

export const ActiveEmployeeDataSchema = SchemaFactory.createForClass(ActiveEmployeeData);
