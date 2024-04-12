import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project, ProjectDocument } from '../schemas/project.schema';
import { ProjectDto } from '../dto/project.dto';
import { ObjectId } from 'mongodb';
import { DecrementRateService } from '../../settings/services/decrement-rate.service';
import { ExcelService } from '../../file-management/services/excel.service';
import { EmployeeRecord, SalaryIncreaseAssumptions } from '../interfaces';
import { GratuityCalculationsService } from './gratuity-calculations.service';

@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<ProjectDocument>,
    //@InjectModel(DecrementRate.name) private readonly decrementRateModel: Model<DecrementRateDocument>,
    private readonly decrementRateService: DecrementRateService,
    private excelService: ExcelService,
    private gratuityCalculationsService: GratuityCalculationsService
  ) {}

  async create(createProjectDto: ProjectDto): Promise<Project> {
    const createdProject = new this.projectModel(createProjectDto);
    return createdProject.save();
  }

  async findAll(): Promise<Project[]> {
    return this.projectModel.find().populate('company', 'name').exec();
  }

  async getProjectsByCompanyId(companyId: string) {
    // Assuming you have a 'company' field in your Project schema
    return this.projectModel.find({ company: companyId }).exec();
  }

  async findOne(id: string): Promise<Project> {
    const isValidObjectId = ObjectId.isValid(id);
    if (!isValidObjectId) {
      throw new Error('Invalid id');
    }
    const project = await this.projectModel.findById(id).populate('company').exec();
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  async update(id: string, updateProjectDto: ProjectDto): Promise<Project> {
    const isValidObjectId = ObjectId.isValid(id);
    if (!isValidObjectId) {
      throw new Error('Invalid id');
    }
    const existingProject = await this.projectModel.findByIdAndUpdate(
      id,
      updateProjectDto,
      { new: true },
    ).exec();
    if (!existingProject) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return existingProject;
  }

  async remove(id: string): Promise<Project> {
    const isValidObjectId = ObjectId.isValid(id);
    if (!isValidObjectId) {
      throw new Error('Invalid id');
    }

    const deletedProject = await this.projectModel.findByIdAndDelete(id).exec();
    if (!deletedProject) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return deletedProject;
  }

  async calculateDecrementTable(projectId: string) {
    const project = await this.projectModel.findById(projectId).exec();
    
    if (!project) {
      throw new Error('Project not found');
    }

    if (!project.assumptions) {
      throw new Error('Project Assumptions not found');
    }
    
    const demographicAssumptions = project.assumptions.thisYear.demographicAssumptions;

    const ratesIds = [
      demographicAssumptions.mortalityRate,
      demographicAssumptions.withdrawalRate,
      demographicAssumptions.illHealthRate,
    ];
    
    // Assuming decrementRates is a separate collection and each rate is a document in it
    const decrementRates = await this.decrementRateService.decrementRateByIds(ratesIds);

    const joinedData = {
      retirementAge: demographicAssumptions.retirementAge,
      mortalityRate: decrementRates.find(rate => rate['_id']?.toString() === demographicAssumptions.mortalityRate),
      mortalityAgeSetBack: demographicAssumptions.mortalityAgeSetBack,
      withdrawalRate: decrementRates.find(rate => rate['_id']?.toString() === demographicAssumptions.withdrawalRate),
      illHealthRate: decrementRates.find(rate => rate['_id']?.toString() === demographicAssumptions.illHealthRate),
    };

    const data = [];
    const minJoiningAge: number = 18;
    const LX_Initial: number = 1000000;
    for (let index = minJoiningAge; index <= joinedData.retirementAge; index++) {
      const CDV = { // calculatedDecrementValue
        age: index,
        QD: joinedData.mortalityRate.value[index + joinedData.mortalityAgeSetBack] ?? 0,
        QW: joinedData.withdrawalRate.value[index - minJoiningAge] ?? 0,
        QI: joinedData.illHealthRate.value[index - minJoiningAge] ?? 0,
        QR: index === joinedData.retirementAge ? 1 : 0,
        LX: null,
        LL: null,
        DD: null,
        DW: null,
        DI: null,
        DR: null
      }
      if (index === minJoiningAge) {
        CDV.LX = LX_Initial;
      } else {
        const CDV_PrevAge = data.length ? data[data.length - 1] : null;
        CDV.LX = CDV_PrevAge.LX - CDV_PrevAge.DD - CDV_PrevAge.DW - CDV_PrevAge.DR - CDV_PrevAge.DI;
      }
      
      CDV.DD = CDV.LX * CDV.QD;
      CDV.DW = CDV.LX * CDV.QW;
      CDV.DI = CDV.LX * CDV.QI;
      CDV.DR = CDV.LX * CDV.QR;
      CDV.LL = CDV.LX - (CDV.DD / 2) - (CDV.DW / 2) - (CDV.DI / 2)
      
      data.push(CDV);
    }
    return data;
  }

  async calculateALD(projectId: string) {
    const project = await this.projectModel.findById(projectId).exec();
    
    if (!project) {
      throw new Error('Project not found');
    }

    if (!project.assumptions) {
      // throw new Error('Project Assumptions not found');
    }

    const fileName =  this.getCompiledDataFileName(project);

    if (!this.excelService.fileExists(fileName)) {
      throw new Error('Employees data file not found');
    }

    const {content} = this.excelService.readFileByName(fileName);

    let employeesData: EmployeeRecord[] = [];
    if (content && content.length) {
      employeesData = content;
    }

    if (employeesData.length === 0) {
      throw new Error('Employees data not found');
    }
    
    const decrementTable = await this.calculateDecrementTable(projectId);

    const aldParams = [];
    const results = [];
    for(const employeeData of employeesData) {
      const aldParam = {};
      aldParam['age'] = employeeData["Age"];
      aldParam['ps'] = employeeData["PastService"];
      aldParam['pay'] = employeeData["Pay"];

      
      const financialAssumptions = project?.assumptions?.thisYear?.financialAssumptions;

      aldParam['discountRate'] = financialAssumptions.discountRate / 100;

      aldParam['salaryIncreaseAssumptions'] = this.createSalaryIncreaseAssumptionsObj(financialAssumptions);

      aldParam['output'] = 1;

      aldParam['decrementTable'] = decrementTable;
      const benifitsStructure = project.benifitsStructure;

      const serviceType = benifitsStructure.serviceType[0];

      aldParam['benefitType'] = serviceType.benefitType;
      aldParam['serviceType'] = serviceType.serviceType;
      aldParam['serviceCap'] = serviceType.serviceCap;

      aldParam['monthsToSalaryInc'] = financialAssumptions.monthOfSalaryIncrease;

      const demographicAssumptions = project?.assumptions?.thisYear?.demographicAssumptions;
      
      aldParam['retAge'] = demographicAssumptions.retirementAge;
      
      const benefitStructure = benifitsStructure.benefitStructure;

      const benifitStructureFactors = { begin: [], end: [], death: [], retirement: [], withdrawl: [], illHealth: [], termination: [] };

      for(const bs of benefitStructure) {
        benifitStructureFactors.begin.push(bs.fromServiceYears);
        benifitStructureFactors.end.push(bs.toServiceYears);
        benifitStructureFactors.death.push(bs.death);
        benifitStructureFactors.retirement.push(bs.retirement);
        benifitStructureFactors.withdrawl.push(bs.withdrawl);
        benifitStructureFactors.illHealth.push(bs.illHealth);
        benifitStructureFactors.termination.push(bs.termination);
      }

      aldParam['benifitStructureFactors'] = benifitStructureFactors;


      const ALD_Calculations = this.gratuityCalculationsService.AL(
        aldParam['age'],
        aldParam['ps'],
        aldParam['pay'],
        aldParam['discountRate'],
        aldParam['salaryIncreaseAssumptions'],
        aldParam['output'],
        aldParam['decrementTable'],
        aldParam['benefitType'],
        aldParam['serviceCap'],
        aldParam['serviceType'],
        aldParam['monthsToSalaryInc'],
        aldParam['retAge'],
        aldParam['benifitStructureFactors'],
        'death'
      );

      const ALW_Calculations = this.gratuityCalculationsService.AL(
        aldParam['age'],
        aldParam['ps'],
        aldParam['pay'],
        aldParam['discountRate'],
        aldParam['salaryIncreaseAssumptions'],
        aldParam['output'],
        aldParam['decrementTable'],
        aldParam['benefitType'],
        aldParam['serviceCap'],
        aldParam['serviceType'],
        aldParam['monthsToSalaryInc'],
        aldParam['retAge'],
        aldParam['benifitStructureFactors'],
        'withdrawl'
      );

      const ALI_Calculations = this.gratuityCalculationsService.AL(
        aldParam['age'],
        aldParam['ps'],
        aldParam['pay'],
        aldParam['discountRate'],
        aldParam['salaryIncreaseAssumptions'],
        aldParam['output'],
        aldParam['decrementTable'],
        aldParam['benefitType'],
        aldParam['serviceCap'],
        aldParam['serviceType'],
        aldParam['monthsToSalaryInc'],
        aldParam['retAge'],
        aldParam['benifitStructureFactors'],
        'illHealth'
      );

      const ALR_Calculations = this.gratuityCalculationsService.ALR(
        aldParam['age'],
        aldParam['ps'],
        aldParam['pay'],
        aldParam['discountRate'],
        aldParam['salaryIncreaseAssumptions'],
        aldParam['output'],
        aldParam['benefitType'],
        aldParam['serviceCap'],
        aldParam['serviceType'],
        aldParam['retAge'],
        aldParam['benifitStructureFactors'],
      )

      results.push({...employeeData, AL: {
        death: ALD_Calculations,
        withdrawl: ALW_Calculations,
        illHealth: ALI_Calculations,
        retirement: ALR_Calculations
      }})
      aldParams.push(aldParam);
    }


    
    return results; // , financialAssumptions: project.assumptions.thisYear.financialAssumptions, project};

    
  }

  createSalaryIncreaseAssumptionsObj(financialAssumptions: any): SalaryIncreaseAssumptions {
    const [si1, si2, si3, si4, si5] = financialAssumptions.salaryIncreaseRates;
    const SI = financialAssumptions.longTermSalaryIncreaseRate;

    return {SI: SI/100, si1: si1/100, si2: si2/100, si3: si3/100, si4: si4/100, si5: si5/100};
  }

  getCompiledDataFileName(project: Project) {
    if (
      !project.compiledDataFiles || 
      project.compiledDataFiles.length <= 0 || 
      !project.compiledDataFiles[0]?.compiledFile?.fileUrl
    ) {
      return '';
    }
    return project.compiledDataFiles[0].compiledFile.fileUrl.split('/').pop() || "";
  }
}
