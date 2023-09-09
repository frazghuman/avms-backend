import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProjectDocument = Project & Document;

@Schema()
export class Project {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  valuationDate: Date;

  @Prop({ required: true })
  valuationType: string;

  @Prop({ required: true })
  stage: string;

  @Prop({ required: true, type: String, ref: 'Company' })
  company: string;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
