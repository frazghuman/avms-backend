import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import * as mongoose from 'mongoose';
import { DecrementRate, DecrementRateDocument } from '../schemas/decrament-rate.schema';
import { DecrementRateDto } from '../dto/decrement-rate.dto';

@Injectable()
export class DecrementRateService {
  constructor(
    @InjectModel(DecrementRate.name) private decrementRateModel: Model<DecrementRateDocument>,
  ) {}

  async create(createDto: DecrementRateDto): Promise<DecrementRate> {
    const createdEntity = new this.decrementRateModel(createDto);
    return createdEntity.save();
  }

  async findAll(): Promise<DecrementRate[]> {
    return this.decrementRateModel.find().exec();
  }

  async findByRateType(rateType: string): Promise<DecrementRate[]> {
    return this.decrementRateModel.find({ rateType }).exec();
  }

  async update(id: any, updateDto: DecrementRateDto): Promise<DecrementRate> {
    return this.decrementRateModel.findByIdAndUpdate(id, updateDto).exec();
  }

  async delete(id: any): Promise<any> {
    return this.decrementRateModel.findByIdAndRemove(id).exec();
  }

  async decrementRateByIds(ids: string[]): Promise<DecrementRate[]> {
    const objectIds = ids.map(id => new mongoose.Types.ObjectId(id));
    return await this.decrementRateModel.find({
      '_id': { $in: objectIds },
    }).exec();
}

  // Add methods for update, delete, and findById
}
