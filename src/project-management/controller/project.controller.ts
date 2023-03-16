import { Body, Controller, Delete, Get, Param, Patch, Post, UsePipes } from '@nestjs/common';
import { ProjectService } from '../services/project.service';
import { CreateProjectDto, UpdateProjectDto } from '../dto/project.dto';
import { JoiValidationPipe, projectValidationSchema } from '../../common/pipes/joi-validation.pipe';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  async findAll() {
    return this.projectService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.projectService.findOne(id);
  }

  @Post()
  @UsePipes(new JoiValidationPipe(projectValidationSchema))
  async create(@Body() project: CreateProjectDto) {
    return this.projectService.create(project);
  }

  @Patch(':id')
  @UsePipes(new JoiValidationPipe(projectValidationSchema))
  async update(
    @Param('id') id: string,
    @Body() project: UpdateProjectDto,
  ) {
    return this.projectService.update(id, project);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.projectService.remove(id);
  }

}
