import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MortalityRateDto } from '../dto/mortality-rate.dto';
import { MortalityRate, MortalityRateDocument } from '../schemas/mortality-rate.schema';

@Injectable()
export class MortalityRateService {
  constructor(
    @InjectModel(MortalityRate.name) private mortalityRateModel: Model<MortalityRateDocument>,
  ) {}

  async create(createDto: MortalityRateDto): Promise<MortalityRate> {
    const createdEntity = new this.mortalityRateModel(createDto);
    return createdEntity.save();
  }

  async findAll(): Promise<MortalityRate[]> {
    return this.mortalityRateModel.find().exec();
  }

  async update(id: any, updateDto: MortalityRateDto): Promise<MortalityRate> {
    return this.mortalityRateModel.findByIdAndUpdate(id, updateDto).exec();
  }

  async delete(id: any): Promise<any> {
    return this.mortalityRateModel.findByIdAndRemove(id).exec();
  }

  // Add methods for update, delete, and findById
}
