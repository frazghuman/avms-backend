import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type UserDocument = User & Document;

@Schema()
export class User extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  password?: string;

  @Prop({ default: false })
  verified: boolean;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Role' })
  role: Types.ObjectId;

  @Prop()
  verificationKey?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre<User>('save', function (next) {
  if (!this.verificationKey) {
    this.verificationKey = generateVerificationKey(); // implement your own function to generate a unique key
  }
  next();
});

// Generate a unique verification key
function generateVerificationKey(): string {
    return uuidv4();
  }