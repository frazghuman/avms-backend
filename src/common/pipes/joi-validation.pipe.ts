import { Injectable, PipeTransform, BadRequestException, ArgumentMetadata } from '@nestjs/common';
import * as Joi from 'joi';

@Injectable()
export class JoiValidationPipe implements PipeTransform {
  constructor(private schema: Joi.Schema) {}

  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body') {
      return value; // Skip validation for non-body parts of the request
    }

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

export const projectContractValidationSchema = Joi.object({
  refNo: Joi.string().optional(),
  address: Joi.string().optional(),
  refDetails: Joi.string().optional(),
  scopeOfWork: Joi.array().items(Joi.string().optional()),
  dataRequired: Joi.string().optional(),
  fee: Joi.object({
    amount: Joi.number().optional(),
    currency: Joi.string().optional(),
    detail: Joi.string().optional(),
    upfrontPercentage: Joi.number().optional(),
    upfrontDetail: Joi.string().optional(),
  }).optional(),
  customerSatisfactionMessage: Joi.string().optional(),
  promisorInfo: Joi.object({
    signature: Joi.binary().optional(),
    name: Joi.string().optional(),
    designation: Joi.string().optional(),
  }).optional(),
});

export const projectValidationSchema = Joi.object({
  name: Joi.string().required(),
  valuationDate: Joi.date().required(),
  valuationType: Joi.string().required(),
  stage: Joi.string().required(),
  company: Joi.string().required(),
  contactPerson: Joi.object({
    name: Joi.string().required(),
    designation: Joi.string().required(),
    email: Joi.string().email().required(),
    phoneNo: Joi.string().required(),
  }).required(),
  contract: projectContractValidationSchema.optional(),
  lastYearInfo: Joi.object().optional(),
  requestedDataFiles: Joi.object().optional(),
  receivedDataFiles: Joi.object().optional(),
  compiledDataFiles: Joi.object().optional(),
  assumptions: Joi.object().optional(),
  benifitsStructure: Joi.object().optional(),
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

export const decrementRateValidationSchema = Joi.object({
  decrementRateName: Joi.string().required().min(1).max(100),
  value: Joi.array().items(Joi.number().min(0).max(1)).required(), // Ensure non-negative numbers
  order: Joi.number().integer().required().min(1).max(102), // Ensure order is an integer
  rateType: Joi.string().required().min(1).max(100),
  startingAge: Joi.number().integer().required().min(0).max(102),
});

export const mortalityRateValidationSchema = Joi.object({
  mortalityRateName: Joi.string().required().min(1).max(100),
  value: Joi.array().items(Joi.number().min(0).max(1)).required(), // Ensure non-negative numbers
  order: Joi.number().integer().required().min(1).max(102) // Ensure order is an integer
});

export const withdrawalRateValidationSchema = Joi.object({
  withdrawalRateName: Joi.string().required().min(1).max(100),
  value: Joi.array().items(Joi.number().min(0).max(1)).required(), // Ensure non-negative numbers
  order: Joi.number().integer().required().min(1).max(102) // Ensure order is an integer
});
