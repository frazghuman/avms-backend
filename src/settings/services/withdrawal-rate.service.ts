import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WithdrawalRateDto } from '../dto/withdrawal-rate.dto';
import { WithdrawalRate, WithdrawalRateDocument } from '../schemas/withdrawal-rate.schema';

@Injectable()
export class WithdrawalRateService {
  constructor(
    @InjectModel(WithdrawalRate.name) private withdrawalRateModel: Model<WithdrawalRateDocument>,
  ) {}

  async create(createDto: WithdrawalRateDto): Promise<WithdrawalRate> {
    const createdEntity = new this.withdrawalRateModel(createDto);
    return createdEntity.save();
  }

  async findAll(): Promise<WithdrawalRate[]> {
    return this.withdrawalRateModel.find().exec();
  }

  async update(id: any, updateDto: WithdrawalRateDto): Promise<WithdrawalRate> {
    return this.withdrawalRateModel.findByIdAndUpdate(id, updateDto).exec();
  }

  async delete(id: any): Promise<any> {
    return this.withdrawalRateModel.findByIdAndRemove(id).exec();
  }

  // Add methods for update, delete, and findById
}
