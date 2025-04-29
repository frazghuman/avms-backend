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
import { omitProperties } from '../../common/functions/omit-properties';
import { TaskService } from '../../file-management/services/task.service';

@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<ProjectDocument>,
    //@InjectModel(DecrementRate.name) private readonly decrementRateModel: Model<DecrementRateDocument>,
    private readonly decrementRateService: DecrementRateService,
    private excelService: ExcelService,
    private taskService: TaskService,
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

  async calculateDecrementTable(demographicAssumptions: any, mortalityAgeSetBackChange: number = 0, withdrawalChangePer: number = 0) {
    

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
      mortalityAgeSetBack: demographicAssumptions.mortalityAgeSetBack + mortalityAgeSetBackChange,
      withdrawalRate: decrementRates.find(rate => rate['_id']?.toString() === demographicAssumptions.withdrawalRate),
      illHealthRate: decrementRates.find(rate => rate['_id']?.toString() === demographicAssumptions.illHealthRate),
    };

    const data = [];
    const minJoiningAge: number = 18;
    const LX_Initial: number = 1000000;
    for (let index = minJoiningAge; index <= joinedData.retirementAge; index++) {
      let withDrawalRate = joinedData.withdrawalRate.value[index - minJoiningAge] ?? 0;
      if (withdrawalChangePer > 0) {
        withDrawalRate = withDrawalRate + ((withdrawalChangePer/100) * withDrawalRate);
      } else if (withdrawalChangePer < 0) {
        withDrawalRate = withDrawalRate - ((withdrawalChangePer/100) * withDrawalRate);
      } 
      const CDV = { // calculatedDecrementValue
        age: index,
        QD: index === joinedData.retirementAge ? 0 : joinedData.mortalityRate.value[index + joinedData.mortalityAgeSetBack] ?? 0,
        QW: index === joinedData.retirementAge ? 0 : withDrawalRate,
        QI: index === joinedData.retirementAge ? 0 : joinedData.illHealthRate.value[index - minJoiningAge] ?? 0,
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

    const {content} = fileName ? this.excelService.readFileByName(fileName) : {content: []};

    let employeesData: EmployeeRecord[] = [];
    if (content && content.length) {
      employeesData = content;
    }

    if (employeesData.length === 0) {
      throw new Error('Employees data not found');
    }

    if (!project) {
      throw new Error('Project not found');
    }

    if (!project.assumptions) {
      throw new Error('Project Assumptions not found');
    }
    
    const demographicAssumptions = project?.assumptions?.thisYear?.demographicAssumptions;

    if (!demographicAssumptions) {
      throw new Error('Demographic Assumptions not found');
    }
    
    const decrementTable = await this.calculateDecrementTable(demographicAssumptions);
    const decrementTableIncreasedMortalitySetback = await this.calculateDecrementTable(demographicAssumptions, 1);
    const decrementTableDecreasedMortalitySetback = await this.calculateDecrementTable(demographicAssumptions, -1);
    const decrementTableIncreasedWithdrawal = await this.calculateDecrementTable(demographicAssumptions, 0, 5);
    const decrementTableDecreasedWithdrawal = await this.calculateDecrementTable(demographicAssumptions, 0, -5);

    const alParams = [];
    const results = [];
    const calculationByFactors = [
      "AL",
      "discountRateByAddingSensitivityPercentage",
      "discountRateBySubtractingSensitivityPercentage",
      "salaryIncreaseRateByAddingSensitivityPercentage",
      "salaryIncreaseRateBySubtractingSensitivityPercentage",
      "increasedMortalitySetback",
      "decreasedMortalitySetback",
      "increasedWithdrawal",
      "decreasedWithdrawal"
    ]
    
    const financialAssumptions = project?.assumptions?.thisYear?.financialAssumptions;

    for(const employeeData of employeesData) {
      const alParam = {};
      alParam['age'] = employeeData["Age"];
      alParam['ps'] = employeeData["PastService"];
      alParam['pay'] = employeeData["Pay"];


      alParam['discountRate'] = financialAssumptions.discountRate / 100;

      alParam['salaryIncreaseAssumptions'] = this.createSalaryIncreaseAssumptionsObj(financialAssumptions);

      alParam['output'] = 1;

      alParam['decrementTable'] = decrementTable;
      const benifitsStructure = project.benifitsStructure;

      const serviceType = benifitsStructure.serviceType[0];

      alParam['benefitType'] = serviceType.benefitType;
      alParam['serviceType'] = serviceType.serviceType;
      alParam['serviceCap'] = serviceType.serviceCap;

      alParam['monthsToSalaryInc'] = financialAssumptions.monthOfSalaryIncrease;

      const demographicAssumptions = project?.assumptions?.thisYear?.demographicAssumptions;
      
      alParam['retAge'] = demographicAssumptions.retirementAge;
      
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

      alParam['benifitStructureFactors'] = benifitStructureFactors;

      

      let resultByFactor = {};

      for(let calculationFactor of calculationByFactors) {

        alParam['discountRate'] = financialAssumptions.discountRate / 100;
        alParam['salaryIncreaseAssumptions'] = this.createSalaryIncreaseAssumptionsObj(financialAssumptions);
        alParam['decrementTable'] = decrementTable;


        if (calculationFactor === "discountRateByAddingSensitivityPercentage") {
          alParam['discountRate'] = (financialAssumptions.discountRate + financialAssumptions.sensitivityChange) / 100;
        }
        
        if (calculationFactor === "discountRateBySubtractingSensitivityPercentage") {
          alParam['discountRate'] = (financialAssumptions.discountRate - financialAssumptions.sensitivityChange) / 100;
        }

        if (calculationFactor === "salaryIncreaseRateByAddingSensitivityPercentage") {
          alParam['salaryIncreaseAssumptions'] = this.createSalaryIncreaseAssumptionsObj(financialAssumptions, financialAssumptions.sensitivityChange);
        }

        if (calculationFactor === "salaryIncreaseRateBySubtractingSensitivityPercentage") {
          alParam['salaryIncreaseAssumptions'] = this.createSalaryIncreaseAssumptionsObj(financialAssumptions, -1 * financialAssumptions.sensitivityChange);
        }

        if (calculationFactor === "increasedMortalitySetback") {
          alParam['decrementTable'] = decrementTableIncreasedMortalitySetback;
        }

        if (calculationFactor === "decreasedMortalitySetback") {
          alParam['decrementTable'] = decrementTableDecreasedMortalitySetback;
        }

        if (calculationFactor === "increasedWithdrawal") {
          alParam['decrementTable'] = decrementTableIncreasedWithdrawal;
        }

        if (calculationFactor === "decreasedWithdrawal") {
          alParam['decrementTable'] = decrementTableDecreasedWithdrawal;
        }
        
        const deathCalculations = this.gratuityCalculationsService.AL(
          alParam['age'],
          alParam['ps'],
          alParam['pay'],
          alParam['discountRate'],
          alParam['salaryIncreaseAssumptions'],
          alParam['output'],
          alParam['decrementTable'],
          alParam['benefitType'],
          alParam['serviceCap'],
          alParam['serviceType'],
          alParam['monthsToSalaryInc'],
          alParam['retAge'],
          alParam['benifitStructureFactors'],
          'death'
        );
  
        const withdrawalCalculations = this.gratuityCalculationsService.AL(
          alParam['age'],
          alParam['ps'],
          alParam['pay'],
          alParam['discountRate'],
          alParam['salaryIncreaseAssumptions'],
          alParam['output'],
          alParam['decrementTable'],
          alParam['benefitType'],
          alParam['serviceCap'],
          alParam['serviceType'],
          alParam['monthsToSalaryInc'],
          alParam['retAge'],
          alParam['benifitStructureFactors'],
          'withdrawl'
        );
  
        const illHealthCalculations = this.gratuityCalculationsService.AL(
          alParam['age'],
          alParam['ps'],
          alParam['pay'],
          alParam['discountRate'],
          alParam['salaryIncreaseAssumptions'],
          alParam['output'],
          alParam['decrementTable'],
          alParam['benefitType'],
          alParam['serviceCap'],
          alParam['serviceType'],
          alParam['monthsToSalaryInc'],
          alParam['retAge'],
          alParam['benifitStructureFactors'],
          'illHealth'
        );
  
        const retirementCalculations = this.gratuityCalculationsService.ALR(
          alParam['age'],
          alParam['ps'],
          alParam['pay'],
          alParam['discountRate'],
          alParam['salaryIncreaseAssumptions'],
          alParam['output'],
          alParam['decrementTable'],
          alParam['benefitType'],
          alParam['serviceCap'],
          alParam['serviceType'],
          alParam['monthsToSalaryInc'],
          alParam['retAge'],
          alParam['benifitStructureFactors'],
        )

        
        resultByFactor = {...resultByFactor, [calculationFactor]: {
          death: deathCalculations,
          withdrawl: withdrawalCalculations,
          illHealth: illHealthCalculations,
          retirement: retirementCalculations
        }}
  
      }
      results.push({...employeeData, ...resultByFactor})


      alParams.push(alParam);
    }

    const additionLiabilityCalculationFactors = calculationByFactors.filter(factor => factor !== "AL");

    const liabilityReport = this.calculateLiabilityReport(results, financialAssumptions.discountRate, financialAssumptions.sensitivityChange);

    const expectedBenifitPayments = this.calculateExpectedBenifitPayments(results);

    
    let finalResults = results.map((result) => {
      return omitProperties(result, ...additionLiabilityCalculationFactors);
    });

    return {finalResults, liabilityReport, expectedBenifitPayments};
    
  }

  createSalaryIncreaseAssumptionsObj(financialAssumptions: any, sensitivityChange: number = 0): SalaryIncreaseAssumptions {
    const [si1, si2, si3, si4, si5] = financialAssumptions.salaryIncreaseRates;
    const SI = financialAssumptions.longTermSalaryIncreaseRate;

    return {SI: (SI + sensitivityChange)/100, si1: (si1 + sensitivityChange)/100, si2: (si2 + sensitivityChange)/100, si3: (si3 + sensitivityChange)/100, si4: (si4 + sensitivityChange)/100, si5: (si5 + sensitivityChange)/100};
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

  calculateLiabilityReport(results, discountRate, sensitivityChange) {
    const liabilityReport = this.libilityReportStructure;

    results.forEach((employeeResult: any) => {
      liabilityReport.liability.death +=  employeeResult.AL.death.AL;
      liabilityReport.liability.retirement +=  employeeResult.AL.retirement.AL;
      liabilityReport.liability.withdrawl +=  employeeResult.AL.withdrawl.AL;
      liabilityReport.liability.illHealth +=  employeeResult.AL.illHealth.AL;

      liabilityReport.normalCost.death +=  employeeResult.AL.death.NC;
      liabilityReport.normalCost.retirement +=  employeeResult.AL.retirement.NC;
      liabilityReport.normalCost.withdrawl +=  employeeResult.AL.withdrawl.NC;
      liabilityReport.normalCost.illHealth +=  employeeResult.AL.illHealth.NC;

      liabilityReport.discountRateByAddingSensitivityPercentage.death +=  employeeResult.discountRateByAddingSensitivityPercentage.death.AL;
      liabilityReport.discountRateByAddingSensitivityPercentage.retirement +=  employeeResult.discountRateByAddingSensitivityPercentage.retirement.AL;
      liabilityReport.discountRateByAddingSensitivityPercentage.withdrawl +=  employeeResult.discountRateByAddingSensitivityPercentage.withdrawl.AL;
      liabilityReport.discountRateByAddingSensitivityPercentage.illHealth +=  employeeResult.discountRateByAddingSensitivityPercentage.illHealth.AL;

      liabilityReport.discountRateBySubtractingSensitivityPercentage.death +=  employeeResult.discountRateBySubtractingSensitivityPercentage.death.AL;
      liabilityReport.discountRateBySubtractingSensitivityPercentage.retirement +=  employeeResult.discountRateBySubtractingSensitivityPercentage.retirement.AL;
      liabilityReport.discountRateBySubtractingSensitivityPercentage.withdrawl +=  employeeResult.discountRateBySubtractingSensitivityPercentage.withdrawl.AL;
      liabilityReport.discountRateBySubtractingSensitivityPercentage.illHealth +=  employeeResult.discountRateBySubtractingSensitivityPercentage.illHealth.AL;

      liabilityReport.salaryIncreaseRateByAddingSensitivityPercentage.death +=  employeeResult.salaryIncreaseRateByAddingSensitivityPercentage.death.AL;
      liabilityReport.salaryIncreaseRateByAddingSensitivityPercentage.retirement +=  employeeResult.salaryIncreaseRateByAddingSensitivityPercentage.retirement.AL;
      liabilityReport.salaryIncreaseRateByAddingSensitivityPercentage.withdrawl +=  employeeResult.salaryIncreaseRateByAddingSensitivityPercentage.withdrawl.AL;
      liabilityReport.salaryIncreaseRateByAddingSensitivityPercentage.illHealth +=  employeeResult.salaryIncreaseRateByAddingSensitivityPercentage.illHealth.AL;

      liabilityReport.salaryIncreaseRateBySubtractingSensitivityPercentage.death +=  employeeResult.salaryIncreaseRateBySubtractingSensitivityPercentage.death.AL;
      liabilityReport.salaryIncreaseRateBySubtractingSensitivityPercentage.retirement +=  employeeResult.salaryIncreaseRateBySubtractingSensitivityPercentage.retirement.AL;
      liabilityReport.salaryIncreaseRateBySubtractingSensitivityPercentage.withdrawl +=  employeeResult.salaryIncreaseRateBySubtractingSensitivityPercentage.withdrawl.AL;
      liabilityReport.salaryIncreaseRateBySubtractingSensitivityPercentage.illHealth +=  employeeResult.salaryIncreaseRateBySubtractingSensitivityPercentage.illHealth.AL;

      liabilityReport.increasedMortalitySetback.death +=  employeeResult.increasedMortalitySetback.death.AL;
      liabilityReport.increasedMortalitySetback.retirement +=  employeeResult.increasedMortalitySetback.retirement.AL;
      liabilityReport.increasedMortalitySetback.withdrawl +=  employeeResult.increasedMortalitySetback.withdrawl.AL;
      liabilityReport.increasedMortalitySetback.illHealth +=  employeeResult.increasedMortalitySetback.illHealth.AL;

      liabilityReport.decreasedMortalitySetback.death +=  employeeResult.decreasedMortalitySetback.death.AL;
      liabilityReport.decreasedMortalitySetback.retirement +=  employeeResult.decreasedMortalitySetback.retirement.AL;
      liabilityReport.decreasedMortalitySetback.withdrawl +=  employeeResult.decreasedMortalitySetback.withdrawl.AL;
      liabilityReport.decreasedMortalitySetback.illHealth +=  employeeResult.decreasedMortalitySetback.illHealth.AL;

      liabilityReport.increasedWithdrawal.death +=  employeeResult.increasedWithdrawal.death.AL;
      liabilityReport.increasedWithdrawal.retirement +=  employeeResult.increasedWithdrawal.retirement.AL;
      liabilityReport.increasedWithdrawal.withdrawl +=  employeeResult.increasedWithdrawal.withdrawl.AL;
      liabilityReport.increasedWithdrawal.illHealth +=  employeeResult.increasedWithdrawal.illHealth.AL;

      liabilityReport.decreasedWithdrawal.death +=  employeeResult.decreasedWithdrawal.death.AL;
      liabilityReport.decreasedWithdrawal.retirement +=  employeeResult.decreasedWithdrawal.retirement.AL;
      liabilityReport.decreasedWithdrawal.withdrawl +=  employeeResult.decreasedWithdrawal.withdrawl.AL;
      liabilityReport.decreasedWithdrawal.illHealth +=  employeeResult.decreasedWithdrawal.illHealth.AL;

    })

    liabilityReport.liability.total = liabilityReport.liability.death
     + liabilityReport.liability.retirement
     + liabilityReport.liability.withdrawl
     + liabilityReport.liability.illHealth;

    liabilityReport.normalCost.total = liabilityReport.normalCost.death
     + liabilityReport.normalCost.retirement
     + liabilityReport.normalCost.withdrawl
     + liabilityReport.normalCost.illHealth;

    liabilityReport.discountRateByAddingSensitivityPercentage.total = liabilityReport.discountRateByAddingSensitivityPercentage.death
     + liabilityReport.discountRateByAddingSensitivityPercentage.retirement
     + liabilityReport.discountRateByAddingSensitivityPercentage.withdrawl
     + liabilityReport.discountRateByAddingSensitivityPercentage.illHealth;

    liabilityReport.discountRateBySubtractingSensitivityPercentage.total = liabilityReport.discountRateBySubtractingSensitivityPercentage.death
     + liabilityReport.discountRateBySubtractingSensitivityPercentage.retirement
     + liabilityReport.discountRateBySubtractingSensitivityPercentage.withdrawl
     + liabilityReport.discountRateBySubtractingSensitivityPercentage.illHealth;

    liabilityReport.salaryIncreaseRateByAddingSensitivityPercentage.total = liabilityReport.salaryIncreaseRateByAddingSensitivityPercentage.death
     + liabilityReport.salaryIncreaseRateByAddingSensitivityPercentage.retirement
     + liabilityReport.salaryIncreaseRateByAddingSensitivityPercentage.withdrawl
     + liabilityReport.salaryIncreaseRateByAddingSensitivityPercentage.illHealth;

    liabilityReport.salaryIncreaseRateBySubtractingSensitivityPercentage.total = liabilityReport.salaryIncreaseRateBySubtractingSensitivityPercentage.death
     + liabilityReport.salaryIncreaseRateBySubtractingSensitivityPercentage.retirement
     + liabilityReport.salaryIncreaseRateBySubtractingSensitivityPercentage.withdrawl
     + liabilityReport.salaryIncreaseRateBySubtractingSensitivityPercentage.illHealth;
     
    liabilityReport.increasedMortalitySetback.total = liabilityReport.increasedMortalitySetback.death
     + liabilityReport.increasedMortalitySetback.retirement
     + liabilityReport.increasedMortalitySetback.withdrawl
     + liabilityReport.increasedMortalitySetback.illHealth;     

    liabilityReport.decreasedMortalitySetback.total = liabilityReport.decreasedMortalitySetback.death
     + liabilityReport.decreasedMortalitySetback.retirement
     + liabilityReport.decreasedMortalitySetback.withdrawl
     + liabilityReport.decreasedMortalitySetback.illHealth;

    liabilityReport.increasedWithdrawal.total = liabilityReport.increasedWithdrawal.death
     + liabilityReport.increasedWithdrawal.retirement
     + liabilityReport.increasedWithdrawal.withdrawl
     + liabilityReport.increasedWithdrawal.illHealth;


    liabilityReport.decreasedWithdrawal.total = liabilityReport.decreasedWithdrawal.death
     + liabilityReport.decreasedWithdrawal.retirement
     + liabilityReport.decreasedWithdrawal.withdrawl
     + liabilityReport.decreasedWithdrawal.illHealth;

    // Duration =[-(Dr+XBPS Less  DR-Xbps)]/[(Baseliability*(DRplus-(DRMinus)]
    liabilityReport.duration = 
      (
        (-1 * (liabilityReport.discountRateByAddingSensitivityPercentage.total - liabilityReport.discountRateBySubtractingSensitivityPercentage.total))
        /
        (liabilityReport.liability.total * ((discountRate/100 + sensitivityChange/100) - (discountRate/100 - sensitivityChange/100)))
      )

    return liabilityReport;
  }

  get libilityReportStructure() {
    return {
      liability: {
        death: 0,
        withdrawl: 0,
        illHealth: 0,
        retirement: 0,
        total: 0
      },
      normalCost: {
        death: 0,
        withdrawl: 0,
        illHealth: 0,
        retirement: 0,
        total: 0
      },
      discountRateByAddingSensitivityPercentage: {
        death: 0,
        withdrawl: 0,
        illHealth: 0,
        retirement: 0,
        total: 0
      },
      discountRateBySubtractingSensitivityPercentage: {
        death: 0,
        withdrawl: 0,
        illHealth: 0,
        retirement: 0,
        total: 0
      },
      salaryIncreaseRateByAddingSensitivityPercentage: {
        death: 0,
        withdrawl: 0,
        illHealth: 0,
        retirement: 0,
        total: 0
      },
      salaryIncreaseRateBySubtractingSensitivityPercentage: {
        death: 0,
        withdrawl: 0,
        illHealth: 0,
        retirement: 0,
        total: 0
      },
      increasedMortalitySetback: {
        death: 0,
        withdrawl: 0,
        illHealth: 0,
        retirement: 0,
        total: 0
      },
      decreasedMortalitySetback: {
        death: 0,
        withdrawl: 0,
        illHealth: 0,
        retirement: 0,
        total: 0
      },
      increasedWithdrawal: {
        death: 0,
        withdrawl: 0,
        illHealth: 0,
        retirement: 0,
        total: 0
      },
      decreasedWithdrawal: {
        death: 0,
        withdrawl: 0,
        illHealth: 0,
        retirement: 0,
        total: 0
      },
      duration: 0
    }
  }

  calculateExpectedBenifitPayments(results) {
    const ecbp = [];

    let t = 0;
    let calculationsOnCurrentIteration = -1;
    while(calculationsOnCurrentIteration != 0) {
      let ecbpCurrentIteration = 0;
      calculationsOnCurrentIteration = 0;
      results.forEach(employeeResult => {
        let aValueCalculated = false;
        if (employeeResult.AL.death.results.length > t) {
          ecbpCurrentIteration += employeeResult.AL.death.results[t].expectedBenifit;
          if (!aValueCalculated) {
            calculationsOnCurrentIteration++;
            aValueCalculated = true;
          }
        }
  
        if (employeeResult.AL.withdrawl.results.length > t) {
          ecbpCurrentIteration += employeeResult.AL.withdrawl.results[t].expectedBenifit;
          if (!aValueCalculated) {
            calculationsOnCurrentIteration++;
            aValueCalculated = true;
          }
        }
  
        if (employeeResult.AL.illHealth.results.length > t) {
          ecbpCurrentIteration += employeeResult.AL.illHealth.results[t].expectedBenifit;
          if (!aValueCalculated) {
            calculationsOnCurrentIteration++;
            aValueCalculated = true;
          }
        }
  
        if (employeeResult.AL.retirement.results.length && employeeResult.AL.retirement.results[0].futureService === t) {
          ecbpCurrentIteration += employeeResult.AL.retirement.results[0].expectedBenifit;
          if (!aValueCalculated) {
            calculationsOnCurrentIteration++;
            aValueCalculated = true;
          }
        }
      });

      if (calculationsOnCurrentIteration !== 0) {
        ecbp.push(ecbpCurrentIteration);
      }

      t++;
    }

    return ecbp;
  }

  async runPensionValuation(data: any) {
    const { projectId, stage} = data;
    const taskType = 'PENSION_VALUATION';
    const taskId = await this.taskService.createTask(null, null, taskType, projectId, stage);

    if (taskId) {
      const task: any = {}
      task.status = 'IN_PROGRESS';
      task.updatedAt = new Date();

      await this.taskService.updateTask(taskId, task);
      
      try {

        const valuationStage = stage.replace('Valuation_', '');

        const projectDetail = await this.findOne(projectId);


        // Set data for the given valuation stage
        const stageValuationParams = projectDetail.valuations[valuationStage];

        if (!stageValuationParams) {
          throw new Error(`Invalid valuation stage name: ${valuationStage}`);
        }

        // Assign data based on valuation stage
        switch (valuationStage) {
          case 'REPLICATION_RUN':
            // Add specific conditions here if needed
            break;

          case 'BASELINE_RUN':
            if (projectDetail?.compiledDataFiles) {
              stageValuationParams['Data'] = projectDetail.compiledDataFiles;
            }
            break;

          case 'SALARY_INCREASE_RATE_CHANGE':
        if (projectDetail?.valuations['BASELINE_RUN']?.Data && projectDetail.valuations['BASELINE_RUN']?.['Benefits Structure']) {
        stageValuationParams['Data'] = projectDetail.valuations['BASELINE_RUN'].Data;
        stageValuationParams['Benefits Structure'] = projectDetail.valuations['BASELINE_RUN']['Benefits Structure'];
        }
            break;

          case 'INDEXATION_RATES_CHANGE':
        if (projectDetail?.valuations['BASELINE_RUN']?.Data && projectDetail.valuations['BASELINE_RUN']?.['Benefits Structure']) {
        stageValuationParams['Data'] = projectDetail.valuations['BASELINE_RUN'].Data;
        stageValuationParams['Benefits Structure'] = projectDetail.valuations['BASELINE_RUN']['Benefits Structure'];
        }
            break;

          case 'DISCOUNT_RATES_CHANGE':
        if (projectDetail?.valuations['BASELINE_RUN']?.Data && projectDetail.valuations['BASELINE_RUN']?.['Benefits Structure']) {
        stageValuationParams['Data'] = projectDetail.valuations['BASELINE_RUN'].Data;
        stageValuationParams['Benefits Structure'] = projectDetail.valuations['BASELINE_RUN']['Benefits Structure'];
        }
            break;

          case 'END_OF_YEAR_VALUATION':
            if (projectDetail?.compiledDataFiles && projectDetail.valuations['BASELINE_RUN']?.Data) {
              stageValuationParams['Data'] = projectDetail.valuations['BASELINE_RUN'].Data;
            }
            break;

          default:
            throw new Error(`Invalid task type stage name: ${valuationStage}`);
        }

        const demographicAssumptions = stageValuationParams?.['Assumptions']?.['demographicAssumptions'];
        if (demographicAssumptions) {
          stageValuationParams['DECREMENT_TABLE'] = await this.calculateDecrementTable(demographicAssumptions);
        } else {
          throw 'Assumptions does not exist!';
        }

        projectDetail.valuations[valuationStage] = stageValuationParams;

        // Remove data for all subsequent stages
        const stages = [
          'REPLICATION_RUN',
          'BASELINE_RUN',
          'SALARY_INCREASE_RATE_CHANGE',
          'INDEXATION_RATES_CHANGE',
          'DISCOUNT_RATES_CHANGE',
          'END_OF_YEAR_VALUATION'
        ];

        const currentStageIndex = stages.indexOf(valuationStage);
        if (currentStageIndex === -1) {
          throw new Error(`Invalid valuation stage name: ${valuationStage}`);
        }

        const tasksByProjectAndTaskType = await this.taskService.getTasksByProjectAndTaskType(projectId, taskType);

        // Clear data for all stages after the current stage
        for (let i = currentStageIndex + 1; i < stages.length; i++) {
          if (projectDetail.valuations[stages[i]]?.Data) {
            delete projectDetail.valuations[stages[i]]['Data'];
          }
          if (projectDetail.valuations[stages[i]]?.['Benefits Structure']) {
            delete projectDetail.valuations[stages[i]]['Benefits Structure'];
          }
          if (projectDetail.valuations[stages[i]]?.['Assumptions']) {
            delete projectDetail.valuations[stages[i]]['Assumptions'];
          }
          if (projectDetail.valuations[stages[i]]?.['DECREMENT_TABLE']) {
            delete projectDetail.valuations[stages[i]]['DECREMENT_TABLE'];
          }

          const completedTasks: any[] = tasksByProjectAndTaskType.filter((t: any) => t.stage === `Valuation_${stages[i]}` && t.status === 'COMPLETED');
          completedTasks.forEach(async (completedTask) => {
            await this.taskService.updateTask(completedTask.id, {status: 'CANCELLED'});
          })
        }

        // Update projectId detail with the modified valuations
        await this.update(projectId, projectDetail);


        task.status = 'COMPLETED';
      } catch (error) {
        task.descriptionType = 'ERROR';
        task.description = error.message;
        task.stacktrace = error.stack;
        task.status = 'FAILED';
      }

      task.updatedAt = new Date();
      await this.taskService.updateTask(taskId, task);
    }

    return {data: taskId, message: `Task created with ID: ${taskId}`};
  }
}
