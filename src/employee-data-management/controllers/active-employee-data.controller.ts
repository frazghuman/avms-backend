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
import { ActiveEmployeeDataService } from '../services/active-employee-data.service';
import { CreateActiveEmployeeDataDto, UpdateActiveEmployeeDataDto } from '../dto/active-employee-data.dto';
import { JoiValidationPipe } from '../../common/pipes/joi-validation.pipe';
import * as Joi from 'joi';

// Validation schemas
const createActiveEmployeeDataValidationSchema = Joi.object({
  SNO: Joi.number().required(),
  ECODE: Joi.string().required(),
  NAME: Joi.string().required(),
  PAY_SCALE: Joi.string().required(),
  DOA: Joi.date().required(),
  DOB: Joi.date().required(),
  PAY: Joi.number().required(),
  AGE: Joi.number().required(),
  PS: Joi.string().required(),
  ORDERLY_ALLOWANCE: Joi.number().optional(),
  project: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  projectStage: Joi.string().optional()
});

const updateActiveEmployeeDataValidationSchema = Joi.object({
  SNO: Joi.number().optional(),
  ECODE: Joi.string().optional(),
  NAME: Joi.string().optional(),
  PAY_SCALE: Joi.string().optional(),
  DOA: Joi.date().optional(),
  DOB: Joi.date().optional(),
  PAY: Joi.number().optional(),
  AGE: Joi.number().optional(),
  PS: Joi.string().optional(),
  ORDERLY_ALLOWANCE: Joi.number().optional(),
  project: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  projectStage: Joi.string().optional()
});

@Controller('active-employee-data')
export class ActiveEmployeeDataController {
  constructor(private readonly activeEmployeeDataService: ActiveEmployeeDataService) {}

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
      return this.activeEmployeeDataService.findWithPagination(filter, pageNum, limitNum);
    }

    return this.activeEmployeeDataService.findAll(filter);
  }

  @Get('project/:projectId')
  async findByProject(
    @Param('projectId') projectId: string,
    @Query('projectStage') projectStage?: string
  ) {
    return this.activeEmployeeDataService.findByProject(projectId, projectStage);
  }

  @Get('project/:projectId/stage/:stageName')
  async findByProjectAndStage(
    @Param('projectId') projectId: string,
    @Param('stageName') stageName: string
  ) {
    return this.activeEmployeeDataService.findByProjectAndStage(projectId, stageName);
  }

  @Get('employee-code/:employeeCode')
  async findByEmployeeCode(@Param('employeeCode') employeeCode: string) {
    return this.activeEmployeeDataService.findByEmployeeCode(employeeCode);
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
    const count = await this.activeEmployeeDataService.count(filter);
    return { count };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.activeEmployeeDataService.findOne(id);
  }

  @Post()
  @UsePipes(new JoiValidationPipe(createActiveEmployeeDataValidationSchema))
  async create(@Body() createDto: CreateActiveEmployeeDataDto) {
    return this.activeEmployeeDataService.create(createDto);
  }

  @Put(':id')
  @UsePipes(new JoiValidationPipe(updateActiveEmployeeDataValidationSchema))
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateActiveEmployeeDataDto
  ) {
    return this.activeEmployeeDataService.update(id, updateDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.activeEmployeeDataService.remove(id);
  }

  @Delete('project/:projectId')
  async removeByProject(
    @Param('projectId') projectId: string,
    @Query('projectStage') projectStage?: string
  ) {
    return this.activeEmployeeDataService.removeByProject(projectId, projectStage);
  }
}
