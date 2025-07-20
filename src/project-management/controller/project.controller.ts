import { Body, Controller, Delete, Get, Param, Post, Put, SetMetadata, UseGuards, UsePipes } from '@nestjs/common';
import { ProjectService } from '../services/project.service';
import { ProjectDto } from '../dto/project.dto';
import { JoiValidationPipe, projectValidationSchema } from '../../common/pipes/joi-validation.pipe';
import { PermissionAuthGuard } from 'src/auth/permission-auth-guard';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  async findAll() {
    return this.projectService.findAll();
  }

  @Get('company/:companyId')
  getProjectsByCompanyId(@Param('companyId') companyId: string) {
    return this.projectService.getProjectsByCompanyId(companyId);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.projectService.findOne(id);
  }

  @Get('decrament-table/:projectId')
  async getDecramentTable(@Param('projectId') projectId: string) {
    return this.projectService.calculateDecrementTable(projectId);
  }

  @Get('calculate-gratuity-valuation/:projectId')
  async getCalculateALD(@Param('projectId') projectId: string) {
    return this.projectService.calculateALD(projectId);
  }

  @Post()
  @UsePipes(new JoiValidationPipe(projectValidationSchema))
  async create(@Body() project: ProjectDto) {
    return this.projectService.create(project);
  }

  @Put(':id')
  // @UseGuards(PermissionAuthGuard)
  // @SetMetadata('permissions', ['manage_projects'])
  // @UsePipes(new JoiValidationPipe(projectValidationSchema))
  async update(
    @Param('id') id: string,
    @Body() project: ProjectDto,
  ) {
    return this.projectService.update(id, project);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.projectService.remove(id);
  }

  @Post(':id/run/valuation/pension')
  // @UsePipes(new JoiValidationPipe(projectValidationSchema))
  async runPensionValuation(@Param('id') id: string, @Body() data: any) {
    return await this.projectService.runPensionValuation({projectId: id, ...data});
  }

  @Get(':projectId/stages/:stageName/batches/:batchType/employees/:employeeCode/records')
  async getEmployeeRecords(
    @Param('projectId') projectId: string,
    @Param('stageName') stageName: string,
    @Param('batchType') batchType: string,
    @Param('employeeCode') employeeCode: string,
  ) {
    return this.projectService.getEmployeeRecordsByCode(
      projectId,
      stageName,
      batchType,
      employeeCode
    );
  }

  @Get(':projectId/stages/:stageName/employees/:employeeCode/records/all-batches')
  async getEmployeeRecordsAllBatchTypes(
    @Param('projectId') projectId: string,
    @Param('stageName') stageName: string,
    @Param('employeeCode') employeeCode: string,
  ) {
    return this.projectService.getEmployeeRecordsAllBatchTypes(
      projectId,
      stageName,
      employeeCode
    );
  }

  @Get(':projectId/stages/:stageName/employees/:employeeCode/find-in-batches')
  async findEmployeeInBatches(
    @Param('projectId') projectId: string,
    @Param('stageName') stageName: string,
    @Param('employeeCode') employeeCode: string,
  ) {
    return this.projectService.findEmployeeInBatches(
      projectId,
      stageName,
      employeeCode
    );
  }

  @Get(':projectId/stages/:stageName/batches/:batchType/employees/:employeeCode/valuation-data')
  async getEmployeeValuationData(
    @Param('projectId') projectId: string,
    @Param('stageName') stageName: string,
    @Param('batchType') batchType: string,
    @Param('employeeCode') employeeCode: string,
  ) {
    const result = await this.projectService.getEmployeeRecordsByCode(
      projectId,
      stageName,
      batchType,
      employeeCode
    );
    return result.valuation_data || [];
  }

  @Get(':projectId/stages/:stageName/batches/:batchType/employees/:employeeCode/summary')
  async getEmployeeBatchSummary(
    @Param('projectId') projectId: string,
    @Param('stageName') stageName: string,
    @Param('batchType') batchType: string,
    @Param('employeeCode') employeeCode: string,
  ) {
    const result = await this.projectService.getEmployeeRecordsByCode(
      projectId,
      stageName,
      batchType,
      employeeCode
    );
    
    return {
      projectName: result.projectName,
      stageName: result.stageName,
      batchType: result.batchType,
      employee_code: result.employee_code,
      employeeType: result.employeeType,
      total_valuation_records: result.total_valuation_records,
      batchInfo: result.batchInfo
    };
  }

  @Get(':projectId/stages/:stageName/debug-structure')
  async debugBatchStructure(
    @Param('projectId') projectId: string,
    @Param('stageName') stageName: string,
  ) {
    return this.projectService.debugBatchStructure(projectId, stageName);
  }

  @Get(':projectId/stages/:stageName/debug-pensioner-data')
  async debugPensionerEmployeeData(
    @Param('projectId') projectId: string,
    @Param('stageName') stageName: string,
  ) {
    return this.projectService.debugPensionerEmployeeData(projectId, stageName);
  }

  @Get(':projectId/stages/:stageName/debug-find-employee/:employeeCode')
  async debugFindEmployee(
    @Param('projectId') projectId: string,
    @Param('stageName') stageName: string,
    @Param('employeeCode') employeeCode: string,
  ) {
    return this.projectService.debugFindEmployee(projectId, stageName, employeeCode);
  }

  @Delete(':id/valuations')
  async deleteValuations(@Param('id') id: string) {
    return this.projectService.deleteValuations(id);
  }
}
