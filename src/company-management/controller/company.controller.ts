import { Body, Controller, Delete, Get, Param, Post, Put, SetMetadata, UseGuards, UsePipes } from '@nestjs/common';
import { Company } from '../schemas/company.schema';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { CompanyService } from '../services/company.service';
import { JoiValidationPipe, companyValidationSchema } from '../../common/pipes/joi-validation.pipe';
import { PermissionAuthGuard } from '../../auth/permission-auth-guard';


@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  @UseGuards(PermissionAuthGuard)
  @SetMetadata('permissions', ['manage_companies'])
  @UsePipes(new JoiValidationPipe(companyValidationSchema))
  async create(@Body() createCompanyDto: CreateCompanyDto): Promise<Company> {
    return this.companyService.create(createCompanyDto);
  }

  @Get()
  @UseGuards(PermissionAuthGuard)
  @SetMetadata('permissions', ['read_companies']) // Set required permissions for this route
  async findAll(): Promise<Company[]> {
    return this.companyService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Company> {
    return this.companyService.findOne(id);
  }

  @Put(':id')
  @UseGuards(PermissionAuthGuard)
  @SetMetadata('permissions', ['manage_companies'])
  // @UsePipes(new JoiValidationPipe(companyValidationSchema))
  async update(@Param('id') id: string, @Body() updateCompanyDto: CreateCompanyDto): Promise<Company> {
    return this.companyService.update(id, updateCompanyDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<Company> {
    return this.companyService.remove(id);
  }
}
