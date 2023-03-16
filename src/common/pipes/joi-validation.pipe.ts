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

export const companyValidationSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string(),
  industry: Joi.string(),
  founded: Joi.date(),
  headquarters: Joi.string(),
  size: Joi.number(),
  website: Joi.string().uri(),
  email: Joi.string().email().required(),
  phone: Joi.string().required(),
  socialMedia: Joi.object({
    facebook: Joi.string().uri(),
    twitter: Joi.string().uri(),
    linkedin: Joi.string().uri(),
    instagram: Joi.string().uri(),
  }),
  logo: Joi.string().uri(),
  coverPhoto: Joi.string().uri(),
});

export const projectValidationSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string(),
  startDate: Joi.date(),
  endDate: Joi.date(),
  status: Joi.string(),
  teamMembers: Joi.array().items(Joi.string()),
  budget: Joi.number(),
  company: Joi.string(),
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
  filePath: Joi.string().required(),
  fileData: Joi.array().items(Joi.any()),
  teamMembers: Joi.array().items(Joi.string())
});
