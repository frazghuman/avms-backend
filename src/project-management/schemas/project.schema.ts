import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ContractDto } from '../dto/project.dto';

export type ProjectDocument = Project & Document;

@Schema()
export class ContactPerson {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  designation: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  phoneNo: string;
}

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

  @Prop({ required: true, type: ContactPerson })
  contactPerson: ContactPerson;

  @Prop({ type: 'Mixed' }) // Use 'Mixed' type for the contract property
  contract: ContractDto;

  @Prop({ type: 'Mixed' })
  lastYearInfo: any;

  @Prop({ type: 'Mixed' })
  requestedDataFiles: any;

  @Prop({ type: 'Mixed' })
  receivedDataFiles: any;

  @Prop({ type: 'Mixed' })
  compiledDataFiles: any;

  @Prop({ type: 'Mixed' })
  assumptions: any;

  @Prop({ type: 'Mixed' })
  benifitsStructure: any;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
