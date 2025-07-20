import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PensionerEmployeeDataDocument = PensionerEmployeeData & Document;

@Schema({ collection: 'pensioneremployeedatas', timestamps: true })
export class PensionerEmployeeData extends Document {
  @Prop({ required: true })
  SNO: number;

  @Prop({ required: true })
  ECODE: number;

  @Prop({ required: true })
  NAME: string;

  @Prop({ required: true })
  TYPE_OF_PENSIONER: string;

  @Prop({ required: true })
  DOB: Date;

  @Prop({ required: true })
  DOR: Date;

  @Prop({ required: true })
  PENSION_AMOUNT: number;

  @Prop({ required: false, default: 0 })
  MEDICAL_ALLOWANCE: number;

  @Prop({ required: false, default: 0 })
  ORDERLY_ALLOWANCE: number;

  @Prop({ required: true })
  AGE_AT_RETIREMENT_ADJ: number;

  @Prop({ required: true })
  AGE: number;

  @Prop({ required: true })
  YEARS_RESTORATION: number;

  @Prop({ required: true })
  CURRENT_VALUE_OF_RESTORED_AMOUNT: number;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: false })
  project: Types.ObjectId;

  @Prop({ required: false })
  projectStage: string;
}

export const PensionerEmployeeDataSchema = SchemaFactory.createForClass(PensionerEmployeeData);
