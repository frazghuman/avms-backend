import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProjectFileDocument = ProjectFile & Document;

@Schema()
export class ProjectFile extends Document {
  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  originalname: string;

  @Prop({ required: true })
  filePath: string;

  @Prop({ required: true })
  mimetype: string;

  @Prop()
  headerRow?: string[];

  @Prop({ required: true })
  size: number;

  @Prop({ required: true })
  uploadDate: Date;

  @Prop()
  aliases?: string[];

  @Prop({type: Types.ObjectId, ref: 'Project' })
  project?: Types.ObjectId;

  @Prop({ required: true })
  md5: string;
}

export const ProjectFileSchema = SchemaFactory.createForClass(ProjectFile);
