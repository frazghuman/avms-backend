import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'todos', timestamps: true })
export class Todo extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: false })
  description: string;

  @Prop({ default: false })
  completed: boolean;

  @Prop({ required: true })
  dueDate: Date;

  @Prop({ required: true })
  status: string;
}

export const TodoSchema = SchemaFactory.createForClass(Todo);