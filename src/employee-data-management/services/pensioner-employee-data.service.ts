import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PensionerEmployeeData } from '../../file-management/schemas/pensioner-employee-data.schema';
import { CreatePensionerEmployeeDataDto, UpdatePensionerEmployeeDataDto } from '../dto/pensioner-employee-data.dto';

@Injectable()
export class PensionerEmployeeDataService {
  constructor(
    @InjectModel('PensionerEmployeeData') 
    private readonly pensionerEmployeeDataModel: Model<PensionerEmployeeData>
  ) {}

  async create(createDto: CreatePensionerEmployeeDataDto): Promise<PensionerEmployeeData> {
    const createdEmployee = new this.pensionerEmployeeDataModel(createDto);
    return createdEmployee.save();
  }

  async findAll(filter: any = {}): Promise<PensionerEmployeeData[]> {
    return this.pensionerEmployeeDataModel.find(filter).exec();
  }

  async findOne(id: string): Promise<PensionerEmployeeData> {
    const employee = await this.pensionerEmployeeDataModel.findById(id).exec();
    if (!employee) {
      throw new NotFoundException(`Pensioner employee data with ID ${id} not found`);
    }
    return employee;
  }

  async findByEmployeeCode(employeeCode: number): Promise<PensionerEmployeeData[]> {
    return this.pensionerEmployeeDataModel.find({ ECODE: employeeCode }).exec();
  }

  async findByProject(projectId: string, projectStage?: string): Promise<PensionerEmployeeData[]> {
    const filter: any = { project: projectId };
    if (projectStage) {
      // Handle projectStage prefix matching for "Valuation_" scenarios
      if (projectStage.startsWith('Valuation_')) {
        filter.projectStage = { $regex: `^${projectStage}`, $options: 'i' };
      } else {
        filter.projectStage = projectStage;
      }
    }
    return this.pensionerEmployeeDataModel.find(filter).exec();
  }

  async findByProjectAndStage(projectId: string, stageName: string): Promise<PensionerEmployeeData[]> {
    const filter: any = { project: projectId };
    
    // Handle both exact matches and prefix matches for Valuation_ stages
    if (stageName.startsWith('Valuation_')) {
      filter.projectStage = { $regex: `^${stageName}`, $options: 'i' };
    } else {
      filter.$or = [
        { projectStage: stageName },
        { projectStage: { $regex: `^Valuation_.*${stageName}`, $options: 'i' } }
      ];
    }
    
    return this.pensionerEmployeeDataModel.find(filter).exec();
  }

  async update(id: string, updateDto: UpdatePensionerEmployeeDataDto): Promise<PensionerEmployeeData> {
    const updatedEmployee = await this.pensionerEmployeeDataModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();
    
    if (!updatedEmployee) {
      throw new NotFoundException(`Pensioner employee data with ID ${id} not found`);
    }
    return updatedEmployee;
  }

  async remove(id: string): Promise<PensionerEmployeeData> {
    const deletedEmployee = await this.pensionerEmployeeDataModel.findByIdAndDelete(id).exec();
    if (!deletedEmployee) {
      throw new NotFoundException(`Pensioner employee data with ID ${id} not found`);
    }
    return deletedEmployee;
  }

  async removeByProject(projectId: string, projectStage?: string): Promise<{ deletedCount: number }> {
    const filter: any = { project: projectId };
    if (projectStage) {
      if (projectStage.startsWith('Valuation_')) {
        filter.projectStage = { $regex: `^${projectStage}`, $options: 'i' };
      } else {
        filter.projectStage = projectStage;
      }
    }
    const result = await this.pensionerEmployeeDataModel.deleteMany(filter).exec();
    return { deletedCount: result.deletedCount };
  }

  async count(filter: any = {}): Promise<number> {
    return this.pensionerEmployeeDataModel.countDocuments(filter).exec();
  }

  async findWithPagination(
    filter: any = {}, 
    page: number = 1, 
    limit: number = 10
  ): Promise<{ data: PensionerEmployeeData[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const data = await this.pensionerEmployeeDataModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .exec();
    
    const total = await this.count(filter);
    const totalPages = Math.ceil(total / limit);
    
    return {
      data,
      total,
      page,
      totalPages
    };
  }
}
