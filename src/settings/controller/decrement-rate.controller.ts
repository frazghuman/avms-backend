import { Body, Controller, Delete, Get, Param, Post, Put, UsePipes } from '@nestjs/common';
import { DecrementRateDto } from '../dto/decrement-rate.dto';
import { DecrementRateService } from '../services/decrement-rate.service';
import { decrementRateValidationSchema, JoiValidationPipe } from '../../common/pipes/joi-validation.pipe';

@Controller('decrement-rate')
export class DecrementRateController {
  constructor(private readonly decrementRateService: DecrementRateService) {}

  @Get('/:rateType')
  findByRateType(@Param('rateType') rateType: string): Promise<DecrementRateDto[]> {
    return this.decrementRateService.findByRateType(rateType);
  }

  @Post()
  @UsePipes(new JoiValidationPipe(decrementRateValidationSchema))
  async create(@Body() createDto: DecrementRateDto) {
    return this.decrementRateService.create(createDto);
  }

  @Get()
  async findAll() {
    return this.decrementRateService.findAll();
  }

  @Put(':id')
  @UsePipes(new JoiValidationPipe(decrementRateValidationSchema))
  async update(@Param('id') id: string, @Body() updateDto: DecrementRateDto) {
    return this.decrementRateService.update(id, updateDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.decrementRateService.delete(id);
  }
}
