import { Schema, Document, Types } from 'mongoose';

export interface Task extends Document {
  id: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'STOPPED' | 'FAILED' | 'CANCELLED';
  filePath: string;
  fileType: string;
  taskType: string;
  project: Types.ObjectId;  // Reference to Project schema
  stage: string;            // Task stage string
  descriptionType: string;
  description: string;
  stacktrace: string;
  createdAt: Date;
  updatedAt: Date;
}

export const TaskSchema = new Schema({
  id: { type: String, required: true, unique: true },
  status: { type: String, enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'STOPPED', 'FAILED', 'CANCELLED'], default: 'NOT_STARTED' },
  filePath: { type: String, required: false },
  fileType: { type: String, required: false },
  taskType: { type: String, required: true },
  project: { type: Types.ObjectId, ref: 'Project', required: true },  // Reference to the Project schema
  stage: { type: String, required: true },                            // Stage string
  descriptionType: { type: String, required: false },
  description: { type: String, required: false },
  stacktrace: { type: String, required: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
