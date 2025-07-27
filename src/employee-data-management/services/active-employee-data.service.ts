import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ActiveEmployeeData } from '../../file-management/schemas/active-employee-data.schema';
import { CreateActiveEmployeeDataDto, UpdateActiveEmployeeDataDto } from '../dto/active-employee-data.dto';

@Injectable()
export class ActiveEmployeeDataService {
  constructor(
    @InjectModel('ActiveEmployeeData') 
    private readonly activeEmployeeDataModel: Model<ActiveEmployeeData>
  ) {}

  async create(createDto: CreateActiveEmployeeDataDto): Promise<ActiveEmployeeData> {
    const createdEmployee = new this.activeEmployeeDataModel(createDto);
    return createdEmployee.save();
  }

  async findAll(filter: any = {}): Promise<ActiveEmployeeData[]> {
    return this.activeEmployeeDataModel.find(filter).exec();
  }

  async findOne(id: string): Promise<ActiveEmployeeData> {
    const employee = await this.activeEmployeeDataModel.findById(id).exec();
    if (!employee) {
      throw new NotFoundException(`Active employee data with ID ${id} not found`);
    }
    return employee;
  }

  async findByEmployeeCode(employeeCode: string): Promise<ActiveEmployeeData[]> {
    return this.activeEmployeeDataModel.find({ ECODE: employeeCode }).exec();
  }

  async findByProject(projectId: string, projectStage?: string): Promise<ActiveEmployeeData[]> {
    const filter: any = { project: projectId };
    if (projectStage) {
      // Handle projectStage prefix matching for "Valuation_" scenarios
      if (projectStage.startsWith('Valuation_')) {
        filter.projectStage = { $regex: `^${projectStage}`, $options: 'i' };
      } else {
        filter.projectStage = projectStage;
      }
    }
    return this.activeEmployeeDataModel.find(filter).exec();
  }

  async findByProjectAndStage(projectId: string, stageName: string): Promise<ActiveEmployeeData[]> {
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
    
    return this.activeEmployeeDataModel.find(filter).exec();
  }

  async findByValuatedEmployeesProjectAndStage(projectId: string, stageName: string): Promise<{ ECODE: string; NAME: string }[]> {
    const filter: any = { project: projectId };

    // If stageName is not Valuation_REPLICATION_RUN or Valuation_BASELINE_RUN, use Valuation_BASELINE_RUN as default
    if (stageName !== 'Valuation_REPLICATION_RUN' && stageName !== 'Valuation_BASELINE_RUN') {
      stageName = 'Valuation_BASELINE_RUN';
    }

    // Handle both exact matches and prefix matches for Valuation_ stages
    if (stageName.startsWith('Valuation_')) {
      filter.projectStage = { $regex: `^${stageName}`, $options: 'i' };
    } else {
      filter.$or = [
        { projectStage: stageName },
        { projectStage: { $regex: `^Valuation_.*${stageName}`, $options: 'i' } }
      ];
    }

    // Return only ECODE and NAME fields
    return this.activeEmployeeDataModel.find(filter).select('ECODE NAME -_id').exec();
  }

  async update(id: string, updateDto: UpdateActiveEmployeeDataDto): Promise<ActiveEmployeeData> {
    const updatedEmployee = await this.activeEmployeeDataModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();
    
    if (!updatedEmployee) {
      throw new NotFoundException(`Active employee data with ID ${id} not found`);
    }
    return updatedEmployee;
  }

  async remove(id: string): Promise<ActiveEmployeeData> {
    const deletedEmployee = await this.activeEmployeeDataModel.findByIdAndDelete(id).exec();
    if (!deletedEmployee) {
      throw new NotFoundException(`Active employee data with ID ${id} not found`);
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
    const result = await this.activeEmployeeDataModel.deleteMany(filter).exec();
    return { deletedCount: result.deletedCount };
  }

  async count(filter: any = {}): Promise<number> {
    return this.activeEmployeeDataModel.countDocuments(filter).exec();
  }

  async findWithPagination(
    filter: any = {}, 
    page: number = 1, 
    limit: number = 10
  ): Promise<{ data: ActiveEmployeeData[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const data = await this.activeEmployeeDataModel
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
