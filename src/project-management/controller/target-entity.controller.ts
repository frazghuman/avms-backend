import { Body, Controller, Delete, Get, Param, Post, Put, SetMetadata, UseGuards, UsePipes } from '@nestjs/common';
import { TargetEntity } from '../schemas/target-entity.schema';
import { TargetEntityService } from '../services/target-entity.service';
import { CreateTargetEntityDto, UpdateTargetEntityDto } from '../dto/target-entity.dto';
import { JoiValidationPipe, targetEntityValidationSchema } from '../../common/pipes/joi-validation.pipe';
import { PermissionAuthGuard } from '../../auth/permission-auth-guard';

@Controller('target-entity')
export class TargetEntityController {
  constructor(private readonly targetEntityService: TargetEntityService) {}

  @Post()
  @UseGuards(PermissionAuthGuard)
  @SetMetadata('permissions', ['crud_entity_type'])
  @UsePipes(new JoiValidationPipe(targetEntityValidationSchema))
  async create(@Body() createDto: CreateTargetEntityDto): Promise<TargetEntity> {
    return this.targetEntityService.create(createDto);
  }

  @Get()
  async findAll(): Promise<TargetEntity[]> {
    return this.targetEntityService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<TargetEntity> {
    return this.targetEntityService.findById(id);
  }

  @Put(':id')
  @UseGuards(PermissionAuthGuard)
  @SetMetadata('permissions', ['crud_entity_type'])
  @UsePipes(new JoiValidationPipe(targetEntityValidationSchema))
  async update(@Param('id') id: string, @Body() updateDto: UpdateTargetEntityDto): Promise<TargetEntity> {
    return this.targetEntityService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(PermissionAuthGuard)
  @SetMetadata('permissions', ['crud_entity_type'])
  async deleteById(@Param('id') id: string): Promise<TargetEntity> {
    return this.targetEntityService.delete(id);
  }
}
