import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CompanyDocument = Company & Document;

@Schema()
export class Company {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop()
  industry?: string;

  @Prop()
  founded?: Date;

  @Prop()
  headquarters?: string;

  @Prop()
  size?: number;

  @Prop()
  website?: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  @Prop({
    type: {
      facebook: String,
      twitter: String,
      instagram: String,
      linkedin: String,
      youtube: String,
    },
  })
  socialMedia: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };

  @Prop()
  logo?: string;

  @Prop()
  coverPhoto?: string;
}

export const CompanySchema = SchemaFactory.createForClass(Company);
