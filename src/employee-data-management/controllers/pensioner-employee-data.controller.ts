import { 
  Body, 
  Controller, 
  Delete, 
  Get, 
  Param, 
  Post, 
  Put, 
  Query, 
  UsePipes 
} from '@nestjs/common';
import { PensionerEmployeeDataService } from '../services/pensioner-employee-data.service';
import { CreatePensionerEmployeeDataDto, UpdatePensionerEmployeeDataDto } from '../dto/pensioner-employee-data.dto';
import { JoiValidationPipe } from '../../common/pipes/joi-validation.pipe';
import * as Joi from 'joi';

// Validation schemas
const createPensionerEmployeeDataValidationSchema = Joi.object({
  SNO: Joi.number().required(),
  ECODE: Joi.number().required(),
  NAME: Joi.string().required(),
  TYPE_OF_PENSIONER: Joi.string().required(),
  DOB: Joi.date().required(),
  DOR: Joi.date().required(),
  PENSION_AMOUNT: Joi.number().required(),
  MEDICAL_ALLOWANCE: Joi.number().optional(),
  ORDERLY_ALLOWANCE: Joi.number().optional(),
  AGE_AT_RETIREMENT_ADJ: Joi.number().required(),
  AGE: Joi.number().required(),
  YEARS_RESTORATION: Joi.number().required(),
  CURRENT_VALUE_OF_RESTORED_AMOUNT: Joi.number().required(),
  project: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  projectStage: Joi.string().optional()
});

const updatePensionerEmployeeDataValidationSchema = Joi.object({
  SNO: Joi.number().optional(),
  ECODE: Joi.number().optional(),
  NAME: Joi.string().optional(),
  TYPE_OF_PENSIONER: Joi.string().optional(),
  DOB: Joi.date().optional(),
  DOR: Joi.date().optional(),
  PENSION_AMOUNT: Joi.number().optional(),
  MEDICAL_ALLOWANCE: Joi.number().optional(),
  ORDERLY_ALLOWANCE: Joi.number().optional(),
  AGE_AT_RETIREMENT_ADJ: Joi.number().optional(),
  AGE: Joi.number().optional(),
  YEARS_RESTORATION: Joi.number().optional(),
  CURRENT_VALUE_OF_RESTORED_AMOUNT: Joi.number().optional(),
  project: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  projectStage: Joi.string().optional()
});

@Controller('pensioner-employee-data')
export class PensionerEmployeeDataController {
  constructor(private readonly pensionerEmployeeDataService: PensionerEmployeeDataService) {}

  @Get()
  async findAll(
    @Query('projectId') projectId?: string,
    @Query('projectStage') projectStage?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const filter: any = {};
    if (projectId) filter.project = projectId;
    if (projectStage) {
      if (projectStage.startsWith('Valuation_')) {
        filter.projectStage = { $regex: `^${projectStage}`, $options: 'i' };
      } else {
        filter.projectStage = projectStage;
      }
    }

    if (page && limit) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      return this.pensionerEmployeeDataService.findWithPagination(filter, pageNum, limitNum);
    }

    return this.pensionerEmployeeDataService.findAll(filter);
  }

  @Get('project/:projectId')
  async findByProject(
    @Param('projectId') projectId: string,
    @Query('projectStage') projectStage?: string
  ) {
    return this.pensionerEmployeeDataService.findByProject(projectId, projectStage);
  }

  @Get('project/:projectId/stage/:stageName')
  async findByProjectAndStage(
    @Param('projectId') projectId: string,
    @Param('stageName') stageName: string
  ) {
    return this.pensionerEmployeeDataService.findByProjectAndStage(projectId, stageName);
  }

  @Get('project/:projectId/stage/:stageName/valuated')
  async findByValuatedEmployeesProjectAndStage(
    @Param('projectId') projectId: string,
    @Param('stageName') stageName: string
  ) {
    return this.pensionerEmployeeDataService.findByValuatedEmployeesProjectAndStage(projectId, stageName);
  }

  

  @Get('employee-code/:employeeCode')
  async findByEmployeeCode(@Param('employeeCode') employeeCode: string) {
    const employeeCodeNum = parseInt(employeeCode, 10);
    return this.pensionerEmployeeDataService.findByEmployeeCode(employeeCodeNum);
  }

  @Get('count')
  async getCount(
    @Query('projectId') projectId?: string,
    @Query('projectStage') projectStage?: string
  ) {
    const filter: any = {};
    if (projectId) filter.project = projectId;
    if (projectStage) {
      if (projectStage.startsWith('Valuation_')) {
        filter.projectStage = { $regex: `^${projectStage}`, $options: 'i' };
      } else {
        filter.projectStage = projectStage;
      }
    }
    const count = await this.pensionerEmployeeDataService.count(filter);
    return { count };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.pensionerEmployeeDataService.findOne(id);
  }

  @Post()
  @UsePipes(new JoiValidationPipe(createPensionerEmployeeDataValidationSchema))
  async create(@Body() createDto: CreatePensionerEmployeeDataDto) {
    return this.pensionerEmployeeDataService.create(createDto);
  }

  @Put(':id')
  @UsePipes(new JoiValidationPipe(updatePensionerEmployeeDataValidationSchema))
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePensionerEmployeeDataDto
  ) {
    return this.pensionerEmployeeDataService.update(id, updateDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.pensionerEmployeeDataService.remove(id);
  }

  @Delete('project/:projectId')
  async removeByProject(
    @Param('projectId') projectId: string,
    @Query('projectStage') projectStage?: string
  ) {
    return this.pensionerEmployeeDataService.removeByProject(projectId, projectStage);
  }
}
