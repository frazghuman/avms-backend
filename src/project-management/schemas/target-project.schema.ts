import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TargetProjectDocument = TargetProject & Document;

@Schema()
export class TargetProject extends Document {
  @Prop({ required: true, type: [{ type: Types.ObjectId, ref: 'TargetEntity' }] })
  targetEntities: Types.ObjectId[];

  @Prop({ required: true, type: Types.ObjectId, ref: 'Project' })
  project: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'ProjectFile' }] })
  file?: string;

  @Prop({ type: [{}] })
  fileData?: Record<string, any>[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  teamMembers?: Types.ObjectId[];
}

export const TargetProjectSchema = SchemaFactory.createForClass(TargetProject);
