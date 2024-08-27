import { Schema, Document, Types } from 'mongoose';

export interface PensionerEmployeeData extends Document {
  SNO: number;
  ECODE: number;
  NAME: string;
  TYPE_OF_PENSIONER: string;
  DOB: Date;
  DOR: Date;
  PENSION_AMOUNT: number;
  MEDICAL_ALLOWANCE: number;
  ORDERLY_ALLOWANCE: number;
  AGE_AT_RETIREMENT_ADJ: number;
  AGE: number;
  YEARS_RESTORATION: number;
  CURRENT_VALUE_OF_RESTORED_AMOUNT: number;
  project?: Types.ObjectId; // Reference to Project
}

export const PensionerEmployeeDataSchema = new Schema({
  SNO: { type: Number, required: true },
  ECODE: { type: Number, required: true },
  NAME: { type: String, required: true },
  TYPE_OF_PENSIONER: { type: String, required: true },
  DOB: { type: Date, required: true },
  DOR: { type: Date, required: true },
  PENSION_AMOUNT: { type: Number, required: true },
  MEDICAL_ALLOWANCE: { type: Number, required: false },
  ORDERLY_ALLOWANCE: { type: Number, required: false },
  AGE_AT_RETIREMENT_ADJ: { type: Number, required: true },
  AGE: { type: Number, required: true },
  YEARS_RESTORATION: { type: Number, required: true },
  CURRENT_VALUE_OF_RESTORED_AMOUNT: { type: Number, required: true },
  project: { type: Types.ObjectId, ref: 'Project' }, // Reference to the Project schema
});
