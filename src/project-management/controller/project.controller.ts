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

  

}
