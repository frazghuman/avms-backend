// company.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ContactPersonDto } from '../dto/create-company.dto';

export type CompanyDocument = Company & Document;

@Schema()
export class Company {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ type: [Object] })
  contactPersons: ContactPersonDto[];
}

export const CompanySchema = SchemaFactory.createForClass(Company);
