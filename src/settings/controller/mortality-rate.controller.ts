import { Body, Controller, Delete, Get, Param, Post, Put, UsePipes } from '@nestjs/common';
import { MortalityRateService } from '../services/mortality-rate.service';
import { MortalityRateDto } from '../dto/mortality-rate.dto';
import { JoiValidationPipe, mortalityRateValidationSchema } from '../../common/pipes/joi-validation.pipe';

@Controller('mortality-rate')
export class MortalityRateController {
  constructor(private readonly mortalityRateService: MortalityRateService) {}

  @Post()
  @UsePipes(new JoiValidationPipe(mortalityRateValidationSchema))
  async create(@Body() createDto: MortalityRateDto) {
    return this.mortalityRateService.create(createDto);
  }

  @Get()
  async findAll() {
    return this.mortalityRateService.findAll();
  }

  @Put(':id')
  @UsePipes(new JoiValidationPipe(mortalityRateValidationSchema))
  async update(@Param('id') id: string, @Body() updateDto: MortalityRateDto) {
    return this.mortalityRateService.update(id, updateDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.mortalityRateService.delete(id);
  }

  // Add endpoints for update, delete, and findById
}
