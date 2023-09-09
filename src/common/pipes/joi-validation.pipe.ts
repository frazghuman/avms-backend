import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';
import * as Joi from 'joi';

@Injectable()
export class JoiValidationPipe implements PipeTransform {
  constructor(private schema: Joi.Schema) {}

  transform(value: any) {
    const { error } = this.schema.validate(value);
    if (error) {
      throw new BadRequestException(error.details.map((detail) => detail.message));
    }
    return value;
  }
}

// company-validation.schema.js
export const companyValidationSchema = Joi.object({
  name: Joi.string().required(),
  code: Joi.string().required(),
  contactPersons: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      designation: Joi.string().required(),
      email: Joi.string().email().required(),
      phoneNo: Joi.string().required(),
    })
  ),
});

export const projectValidationSchema = Joi.object({
  name: Joi.string().required(),
  valuationDate: Joi.date().required(),
  valuationType: Joi.string().required(),
  stage: Joi.string().required(),
  company: Joi.string().required()
});

export const targetEntityValidationSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string(),
  startDate: Joi.date(),
  endDate: Joi.date(),
  status: Joi.string(),
  teamMembers: Joi.array().items(Joi.string()),
  budget: Joi.number(),
  company: Joi.string(),
});

export const targetProjectValidationSchema = Joi.object({
  targetEntities: Joi.array().items(Joi.string().required()).min(1).required(),
  project: Joi.string().required(),
  file: Joi.string(),
  fileData: Joi.array().items(Joi.any()),
  teamMembers: Joi.array().items(Joi.string())
});
