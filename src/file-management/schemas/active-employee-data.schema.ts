import { Schema, Document, Types } from 'mongoose';

export interface ActiveEmployeeData extends Document {
  SNO: number;
  ECODE: string;
  NAME: string;
  PAY_SCALE: string;
  DOA: Date;
  DOB: Date;
  PAY: number;
  AGE: number;
  PS: string;
  ORDERLY_ALLOWANCE: number;
  project?: Types.ObjectId; // Reference to Project
}

export const ActiveEmployeeDataSchema = new Schema({
  SNO: { type: Number, required: true },
  ECODE: { type: String, required: true },
  NAME: { type: String, required: true },
  PAY_SCALE: { type: String, required: true },
  DOA: { type: Date, required: true },
  DOB: { type: Date, required: true },
  PAY: { type: Number, required: true },
  AGE: { type: Number, required: true },
  PS: { type: String, required: true },
  ORDERLY_ALLOWANCE: { type: Number, required: false },
  project: { type: Types.ObjectId, ref: 'Project' }, // Reference to the Project schema
});
