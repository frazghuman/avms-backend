import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TargetEntity, TargetEntityDocument } from '../schemas/target-entity.schema';
import { CreateTargetEntityDto, UpdateTargetEntityDto } from '../dto/target-entity.dto';

@Injectable()
export class TargetEntityService {
  constructor(
    @InjectModel(TargetEntity.name) private readonly targetEntityModel: Model<TargetEntityDocument>,
  ) {}

  async create(createTargetEntityDto: CreateTargetEntityDto): Promise<TargetEntity> {
    createTargetEntityDto['alias'] = this.generateAlias(createTargetEntityDto.name);
    const createdTargetEntity = new this.targetEntityModel(createTargetEntityDto);
    return createdTargetEntity.save();
  }

  async findAll(): Promise<TargetEntity[]> {
    return this.targetEntityModel.find().exec();
  }

  async findById(id: string): Promise<TargetEntity> {
    const targetEntity = await this.targetEntityModel.findById(id).exec();
    if (!targetEntity) {
      throw new NotFoundException(`Target Entity with ID ${id} not found`);
    }
    return targetEntity;
  }

  async update(id: string, updateTargetEntityDto: UpdateTargetEntityDto): Promise<TargetEntity> {
    const targetEntity = await this.findById(id);
    targetEntity.name = updateTargetEntityDto.name;
    targetEntity['alias'] = this.generateAlias(updateTargetEntityDto.name);
    return targetEntity.save();
  }

  async delete(id: string): Promise<TargetEntity> {
    const deletedTargetEntity = await this.targetEntityModel.findByIdAndDelete(id).exec();
    if (!deletedTargetEntity) {
      throw new NotFoundException(`TargetEntity with ID "${id}" not found`);
    }
    return deletedTargetEntity;
  }

  generateAlias(str: string): string {
    // Convert to lowercase and replace non-alphanumeric characters with a space
    const normalized = str.toLowerCase().replace(/[^a-z0-9]/g, ' ');
  
    // Split into words and join with hyphen
    const words = normalized.split(' ').filter(Boolean);
    const alias = words.join('-');
  
    return alias;
  }
}
