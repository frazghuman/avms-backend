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
