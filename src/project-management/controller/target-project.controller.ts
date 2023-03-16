import { Controller, Get, Post, Put, Delete, Param, Body, UsePipes } from '@nestjs/common';
import { JoiValidationPipe, targetProjectValidationSchema } from '../../common/pipes/joi-validation.pipe';
import { TargetProjectService } from '../services/target-project.service';
import { TargetProject } from '../schemas/target-project.schema';
import { CreateTargetProjectDto, UpdateTargetProjectDto } from '../dto/target-project.dto';

@Controller('target-projects')
export class TargetProjectController {
  constructor(private readonly targetProjectService: TargetProjectService) {}

  @Get()
  async findAll(): Promise<TargetProject[]> {
    return this.targetProjectService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<TargetProject> {
    return this.targetProjectService.findById(id);
  }

  @Post()
  @UsePipes(new JoiValidationPipe(targetProjectValidationSchema))
  async create(@Body() targetProject: CreateTargetProjectDto): Promise<TargetProject> {
    return this.targetProjectService.create(targetProject);
  }

  @Put(':id')
  @UsePipes(new JoiValidationPipe(targetProjectValidationSchema))
  
  async update(@Param('id') id: string, @Body() targetProject: UpdateTargetProjectDto): Promise<TargetProject> {
    return this.targetProjectService.update(id, targetProject);
  }

  @Delete(':id')
  async deleteById(@Param('id') id: string): Promise<TargetProject> {
    return this.targetProjectService.delete(id);
  }
}
