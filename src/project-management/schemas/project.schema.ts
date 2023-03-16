import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { User } from '../../user-management/schemas/user.schema';

export type ProjectDocument = Project & Document;

@Schema()
export class Project {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop()
  startDate?: Date;

  @Prop()
  endDate?: Date;

  @Prop()
  status?: string;

  @Prop()
  budget?: number;

  @Prop({ type: [{ type: String, ref: 'User' }] })
  teamMembers?: User[];

  @Prop({ type: String, ref: 'Company' })
  company?: string;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
