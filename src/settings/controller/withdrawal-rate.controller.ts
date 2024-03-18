import { Body, Controller, Delete, Get, Param, Post, Put, UsePipes } from '@nestjs/common';
import { WithdrawalRateService } from '../services/withdrawal-rate.service';
import { WithdrawalRateDto } from '../dto/withdrawal-rate.dto';
import { JoiValidationPipe, withdrawalRateValidationSchema } from '../../common/pipes/joi-validation.pipe';

@Controller('withdrawal-rate')
export class WithdrawalRateController {
  constructor(private readonly withdrawalRateService: WithdrawalRateService) {}

  @Post()
  @UsePipes(new JoiValidationPipe(withdrawalRateValidationSchema))
  async create(@Body() createDto: WithdrawalRateDto) {
    return this.withdrawalRateService.create(createDto);
  }

  @Get()
  async findAll() {
    return this.withdrawalRateService.findAll();
  }

  @Put(':id')
  @UsePipes(new JoiValidationPipe(withdrawalRateValidationSchema))
  async update(@Param('id') id: string, @Body() updateDto: WithdrawalRateDto) {
    return this.withdrawalRateService.update(id, updateDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.withdrawalRateService.delete(id);
  }

  // Add endpoints for update, delete, and findById
}
