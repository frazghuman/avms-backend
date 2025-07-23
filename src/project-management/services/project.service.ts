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
import { ProgressService } from '../../common/websocket/progress.gateway';
import { v4 as uuidv4 } from 'uuid';
import { omitProperties } from '../../common/functions/omit-properties';
import { TaskService } from '../../file-management/services/task.service';
import axios from 'axios';

@Injectable()
export class ProjectService {
  private employeeRecordsCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<ProjectDocument>,
    //@InjectModel(DecrementRate.name) private readonly decrementRateModel: Model<DecrementRateDocument>,
    private readonly decrementRateService: DecrementRateService,
    private excelService: ExcelService,
    private taskService: TaskService,
    private gratuityCalculationsService: GratuityCalculationsService,
    private readonly progressService: ProgressService
  ) {}

  async create(createProjectDto: ProjectDto): Promise<Project> {
    const createdProject = new this.projectModel(createProjectDto);
    return createdProject.save();
  }

  async findAll(): Promise<Project[]> {
    return this.projectModel.find().populate('company', 'name').exec();
  }

  async getProjectsByCompanyId(companyId: string) {
    try {
      // Validate companyId
      if (!companyId) {
        throw new Error('Company ID is required');
      }

      // Check if companyId is a valid ObjectId
      const isValidObjectId = ObjectId.isValid(companyId);
      if (!isValidObjectId) {
        throw new Error('Invalid company ID format');
      }

      // Fetch only first-level properties using inclusion projection only
      const projects = await this.projectModel.find(
        { company: companyId },
        {
          // Include only the basic first-level string/primitive properties
          _id: 1,
          name: 1,
          description: 1,
          status: 1,
          stage: 1,
          valuationType: 1,
          valuationDate: 1,
          company: 1,
          createdAt: 1,
          updatedAt: 1,
          __v: 1
          // Note: All other fields (assumptions, benifitsStructure, valuations, etc.) 
          // are automatically excluded when using inclusion projection
        }
      ).populate('company', 'name').exec();

      return projects;
    } catch (error) {
      console.error('Error in getProjectsByCompanyId:', error);
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }
  }

  async findOne(id: string): Promise<Project> {
    const isValidObjectId = ObjectId.isValid(id);
    if (!isValidObjectId) {
      throw new Error('Invalid id');
    }
    
    // Use aggregation pipeline to dynamically exclude batch_info from all valuation stages
    const projects = await this.projectModel.aggregate([
      { $match: { _id: new ObjectId(id) } },
      {
        $addFields: {
          valuations: {
            $cond: {
              if: { $ne: ["$valuations", null] },
              then: {
                $arrayToObject: {
                  $map: {
                    input: { $objectToArray: "$valuations" },
                    as: "stage",
                    in: {
                      k: "$$stage.k",
                      v: {
                        $arrayToObject: {
                          $filter: {
                            input: { $objectToArray: "$$stage.v" },
                            as: "field",
                            cond: { $ne: ["$$field.k", "batch_info"] }
                          }
                        }
                      }
                    }
                  }
                }
              },
              else: "$valuations"
            }
          }
        }
      },
      {
        $lookup: {
          from: "companies",
          localField: "company",
          foreignField: "_id",
          as: "company"
        }
      },
      {
        $unwind: {
          path: "$company",
          preserveNullAndEmptyArrays: true
        }
      }
    ]).exec();
    
    if (!projects || projects.length === 0) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    
    return projects[0] as Project;
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

  async getEmployeeRecordsByCode(
    projectId: string,
    stageName: string,
    batchType: string,
    employeeCode: string
  ): Promise<any> {
    // Create cache key
    const cacheKey = `${projectId}_${stageName}_${batchType}_${employeeCode}`;
    
    // Check cache first
    const cached = this.employeeRecordsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached.data;
    }

    const isValidObjectId = ObjectId.isValid(projectId);
    if (!isValidObjectId) {
      throw new Error('Invalid project ID');
    }

    const employeeCodeNum = parseInt(employeeCode);

    // Optimized pipeline to directly find the employee without intermediate queries
    const pipeline = [
      { $match: { _id: new ObjectId(projectId) } },
      {
        $project: {
          projectName: "$name",
          batchResults: `$valuations.${stageName}.batch_info.batch_results`
        }
      },
      {
        $unwind: {
          path: "$batchResults",
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $match: {
          "batchResults.batch_type": batchType
        }
      },
      {
        $addFields: {
          employeeResults: {
            $cond: {
              if: { $eq: ["$batchResults.batch_type", "active_employees"] },
              then: {
                $cond: {
                  if: { 
                    $and: [
                      { $ne: ["$batchResults.result.active_employee_results", null] },
                      { $ne: ["$batchResults.result.active_employee_results.active_employees_results", null] }
                    ]
                  },
                  then: "$batchResults.result.active_employee_results.active_employees_results",
                  else: []
                }
              },
              else: {
                $cond: {
                  if: { 
                    $and: [
                      { $ne: ["$batchResults.result.pensioner_employee_results", null] },
                      { $ne: ["$batchResults.result.pensioner_employee_results.pensioner_employees_results", null] }
                    ]
                  },
                  then: "$batchResults.result.pensioner_employee_results.pensioner_employees_results",
                  else: []
                }
              }
            }
          },
          employeeType: {
            $cond: {
              if: { $eq: ["$batchResults.batch_type", "active_employees"] },
              then: "active",
              else: "pensioner"
            }
          }
        }
      },
      {
        $unwind: {
          path: "$employeeResults",
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $match: {
          $or: [
            { "employeeResults.employee_code": employeeCodeNum },
            { "employeeResults.employee_code": employeeCode }  // Also try string version
          ]
        }
      },
      {
        $project: {
          _id: 0,
          projectName: 1,
          stageName: { $literal: stageName },
          batchType: "$batchResults.batch_type",
          employee_code: employeeCodeNum,
          employeeType: 1,
          batchInfo: {
            status: "$batchResults.result.summary.status",
            started_at: "$batchResults.started_at",
            total_employees: "$batchResults.total_employees",
            batch_size: "$batchResults.batch_size",
            batch_number: "$batchResults.batch_number",
            completed_at: "$batchResults.completed_at"
          },
          valuation_data: "$employeeResults.valuation_data",
          total_valuation_records: { 
            $cond: {
              if: { $isArray: "$employeeResults.valuation_data" },
              then: { $size: "$employeeResults.valuation_data" },
              else: 0
            }
          }
        }
      }
    ];

    const results = await this.projectModel.aggregate(pipeline).exec();

    if (!results || results.length === 0) {
      throw new NotFoundException(
        `No records found for employee ${employeeCode} in project ${projectId}, stage ${stageName}, batch type ${batchType}`
      );
    }

    const result = results[0];
    
    // Cache the result
    this.employeeRecordsCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    // Clean up old cache entries (simple cleanup)
    if (this.employeeRecordsCache.size > 1000) {
      const now = Date.now();
      for (const [key, value] of this.employeeRecordsCache.entries()) {
        if (now - value.timestamp > this.CACHE_TTL) {
          this.employeeRecordsCache.delete(key);
        }
      }
    }

    return result;
  }

  async getEmployeeRecordsAllBatchTypes(
    projectId: string,
    stageName: string,
    employeeCode: string
  ): Promise<any> {
    const isValidObjectId = ObjectId.isValid(projectId);
    if (!isValidObjectId) {
      throw new Error('Invalid project ID');
    }

    const employeeCodeNum = parseInt(employeeCode);

    const pipeline = [
      { $match: { _id: new ObjectId(projectId) } },
      {
        $project: {
          projectName: "$name",
          batchResults: `$valuations.${stageName}.batch_info.batch_results`
        }
      },
      {
        $unwind: {
          path: "$batchResults",
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $addFields: {
          employeeResults: {
            $cond: {
              if: { $ne: ["$batchResults.active_employee_results", null] },
              then: {
                results: "$batchResults.active_employee_results.active_employees_results",
                type: "active"
              },
              else: {
                $cond: {
                  if: { $ne: ["$batchResults.pensioner_employee_results", null] },
                  then: {
                    results: "$batchResults.pensioner_employee_results.pensioner_employees_results",
                    type: "pensioner"
                  },
                  else: {
                    results: [],
                    type: "unknown"
                  }
                }
              }
            }
          }
        }
      },
      {
        $unwind: {
          path: "$employeeResults.results",
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $match: {
          "employeeResults.results.employee_code": employeeCodeNum
        }
      },
      {
        $group: {
          _id: {
            projectName: "$projectName",
            employeeCode: employeeCodeNum,
            batchType: "$batchResults.batch_type"
          },
          batchInfo: {
            $first: {
              status: "$batchResults.status",
              started_at: "$batchResults.started_at",
              total_employees: "$batchResults.total_employees",
              batch_size: "$batchResults.batch_size",
              batch_number: "$batchResults.batch_number",
              completed_at: "$batchResults.completed_at"
            }
          },
          employeeType: { $first: "$employeeResults.type" },
          valuation_data: {
            $push: "$employeeResults.results.valuation_data"
          }
        }
      },
      {
        $group: {
          _id: {
            projectName: "$_id.projectName",
            employeeCode: "$_id.employeeCode"
          },
          batches: {
            $push: {
              batchType: "$_id.batchType",
              employeeType: "$employeeType",
              batchInfo: "$batchInfo",
              total_records: {
                $sum: {
                  $map: {
                    input: "$valuation_data",
                    as: "data",
                    in: { $size: "$$data" }
                  }
                }
              },
              valuation_data: {
                $reduce: {
                  input: "$valuation_data",
                  initialValue: [],
                  in: { $concatArrays: ["$$value", "$$this"] }
                }
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          projectName: "$_id.projectName",
          stageName: { $literal: stageName },
          employee_code: "$_id.employeeCode",
          total_batches: { $size: "$batches" },
          batches: 1
        }
      }
    ];

    const results = await this.projectModel.aggregate(pipeline).exec();

    if (!results || results.length === 0) {
      throw new NotFoundException(
        `No records found for employee ${employeeCode} in project ${projectId}, stage ${stageName}`
      );
    }

    return results[0];
  }

  async findEmployeeInBatches(
    projectId: string,
    stageName: string,
    employeeCode: string
  ): Promise<any> {
    const isValidObjectId = ObjectId.isValid(projectId);
    if (!isValidObjectId) {
      throw new Error('Invalid project ID');
    }

    const employeeCodeNum = parseInt(employeeCode);

    const pipeline = [
      { $match: { _id: new ObjectId(projectId) } },
      {
        $project: {
          projectName: "$name",
          batchResults: `$valuations.${stageName}.batch_info.batch_results`
        }
      },
      {
        $unwind: {
          path: "$batchResults",
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $addFields: {
          hasEmployee: {
            $or: [
              {
                $in: [
                  employeeCodeNum,
                  {
                    $ifNull: [
                      {
                        $map: {
                          input: "$batchResults.active_employee_results.active_employees_results",
                          as: "emp",
                          in: "$$emp.employee_code"
                        }
                      },
                      []
                    ]
                  }
                ]
              },
              {
                $in: [
                  employeeCodeNum,
                  {
                    $ifNull: [
                      {
                        $map: {
                          input: "$batchResults.pensioner_employee_results.pensioner_employees_results",
                          as: "emp",
                          in: "$$emp.employee_code"
                        }
                      },
                      []
                    ]
                  }
                ]
              }
            ]
          },
          employeeType: {
            $cond: {
              if: {
                $in: [
                  employeeCodeNum,
                  {
                    $ifNull: [
                      {
                        $map: {
                          input: "$batchResults.active_employee_results.active_employees_results",
                          as: "emp",
                          in: "$$emp.employee_code"
                        }
                      },
                      []
                    ]
                  }
                ]
              },
              then: "active",
              else: {
                $cond: {
                  if: {
                    $in: [
                      employeeCodeNum,
                      {
                        $ifNull: [
                          {
                            $map: {
                              input: "$batchResults.pensioner_employee_results.pensioner_employees_results",
                              as: "emp",
                              in: "$$emp.employee_code"
                            }
                          },
                          []
                        ]
                      }
                    ]
                  },
                  then: "pensioner",
                  else: null
                }
              }
            }
          }
        }
      },
      {
        $match: {
          hasEmployee: true
        }
      },
      {
        $project: {
          projectName: 1,
          batchType: "$batchResults.batch_type",
          employeeType: 1,
          batchStatus: "$batchResults.status",
          batchNumber: "$batchResults.batch_number"
        }
      },
      {
        $group: {
          _id: {
            projectName: "$projectName",
            employeeCode: employeeCodeNum
          },
          foundInBatches: {
            $push: {
              batchType: "$batchType",
              employeeType: "$employeeType",
              batchStatus: "$batchStatus",
              batchNumber: "$batchNumber"
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          projectName: "$_id.projectName",
          stageName: { $literal: stageName },
          employee_code: "$_id.employeeCode",
          total_batches_found: { $size: "$foundInBatches" },
          foundInBatches: 1
        }
      }
    ];

    const results = await this.projectModel.aggregate(pipeline).exec();

    if (!results || results.length === 0) {
      return {
        projectName: null,
        stageName: stageName,
        employee_code: employeeCodeNum,
        total_batches_found: 0,
        foundInBatches: [],
        message: `Employee ${employeeCode} not found in any batches for stage ${stageName}`
      };
    }

    return results[0];
  }

  // Debug method to see actual structure
  async debugBatchStructure(projectId: string, stageName: string): Promise<any> {
    const isValidObjectId = ObjectId.isValid(projectId);
    if (!isValidObjectId) {
      throw new Error('Invalid project ID');
    }

    const pipeline = [
      { $match: { _id: new ObjectId(projectId) } },
      {
        $project: {
          projectName: "$name",
          batchInfo: `$valuations.${stageName}.batch_info`,
          availableStages: { $objectToArray: "$valuations" }
        }
      }
    ];

    const results = await this.projectModel.aggregate(pipeline).exec();
    return results[0] || { message: "No data found" };
  }

  // Debug method specifically for finding a specific employee
  async debugFindEmployee(projectId: string, stageName: string, employeeCode: string): Promise<any> {
    const isValidObjectId = ObjectId.isValid(projectId);
    if (!isValidObjectId) {
      throw new Error('Invalid project ID');
    }

    const employeeCodeNum = parseInt(employeeCode);

    const pipeline = [
      { $match: { _id: new ObjectId(projectId) } },
      {
        $project: {
          projectName: "$name",
          batchResults: `$valuations.${stageName}.batch_info.batch_results`
        }
      },
      {
        $unwind: {
          path: "$batchResults",
          preserveNullAndEmptyArrays: false
        }
      }
    ];

    const allBatches = await this.projectModel.aggregate(pipeline).exec();
    
    const result = {
      projectName: allBatches[0]?.projectName || 'Unknown',
      searchingFor: employeeCodeNum,
      totalBatches: allBatches.length,
      batchAnalysis: []
    };

    for (const batch of allBatches) {
      const batchInfo = {
        batch_type: batch.batchResults.batch_type,
        batch_number: batch.batchResults.batch_number,
        has_result: !!batch.batchResults.result,
        result_keys: batch.batchResults.result ? Object.keys(batch.batchResults.result) : [],
        employee_analysis: {
          active_employees: {
            exists: false,
            count: 0,
            has_target_employee: false,
            employee_codes: []
          },
          pensioner_employees: {
            exists: false,
            count: 0,
            has_target_employee: false,
            employee_codes: []
          }
        }
      };

      // Check active employees
      if (batch.batchResults.result?.active_employee_results?.active_employees_results) {
        const activeResults = batch.batchResults.result.active_employee_results.active_employees_results;
        batchInfo.employee_analysis.active_employees.exists = true;
        batchInfo.employee_analysis.active_employees.count = activeResults.length;
        batchInfo.employee_analysis.active_employees.employee_codes = activeResults.map(emp => emp.employee_code);
        batchInfo.employee_analysis.active_employees.has_target_employee = activeResults.some(emp => emp.employee_code === employeeCodeNum);
      }

      // Check pensioner employees
      if (batch.batchResults.result?.pensioner_employee_results?.pensioner_employees_results) {
        const pensionerResults = batch.batchResults.result.pensioner_employee_results.pensioner_employees_results;
        batchInfo.employee_analysis.pensioner_employees.exists = true;
        batchInfo.employee_analysis.pensioner_employees.count = pensionerResults.length;
        batchInfo.employee_analysis.pensioner_employees.employee_codes = pensionerResults.map(emp => emp.employee_code);
        batchInfo.employee_analysis.pensioner_employees.has_target_employee = pensionerResults.some(emp => emp.employee_code === employeeCodeNum);
      }

      result.batchAnalysis.push(batchInfo);
    }

    return result;
  }

  // Debug method specifically for pensioner employee data
  async debugPensionerEmployeeData(projectId: string, stageName: string): Promise<any> {
    const isValidObjectId = ObjectId.isValid(projectId);
    if (!isValidObjectId) {
      throw new Error('Invalid project ID');
    }

    const pipeline = [
      { $match: { _id: new ObjectId(projectId) } },
      {
        $project: {
          projectName: "$name",
          batchResults: `$valuations.${stageName}.batch_info.batch_results`
        }
      },
      {
        $unwind: {
          path: "$batchResults",
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $match: {
          "batchResults.batch_type": "pensioner_employees"
        }
      },
      {
        $project: {
          projectName: 1,
          batch_type: "$batchResults.batch_type",
          batch_number: "$batchResults.batch_number",
          batch_status: "$batchResults.result.summary.status",
          pensioner_results_structure: {
            $cond: {
              if: { $ne: ["$batchResults.result.pensioner_employee_results", null] },
              then: {
                has_pensioner_employee_results: true,
                has_pensioner_employees_results: { $ne: ["$batchResults.result.pensioner_employee_results.pensioner_employees_results", null] },
                pensioner_count: { 
                  $cond: {
                    if: { $isArray: "$batchResults.result.pensioner_employee_results.pensioner_employees_results" },
                    then: { $size: "$batchResults.result.pensioner_employee_results.pensioner_employees_results" },
                    else: 0
                  }
                },
                sample_employee_codes: {
                  $slice: [
                    {
                      $map: {
                        input: { $ifNull: ["$batchResults.result.pensioner_employee_results.pensioner_employees_results", []] },
                        as: "emp",
                        in: "$$emp.employee_code"
                      }
                    },
                    5
                  ]
                }
              },
              else: {
                has_pensioner_employee_results: false,
                available_result_keys: { $objectToArray: "$batchResults.result" }
              }
            }
          }
        }
      }
    ];

    const results = await this.projectModel.aggregate(pipeline).exec();
    return {
      total_pensioner_batches: results.length,
      batches: results
    };
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
        QD: index === joinedData.retirementAge ? 0 : parseFloat(joinedData.mortalityRate.value[index + joinedData.mortalityAgeSetBack].toFixed(5)) ?? 0,
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
      CDV.LL = CDV.LX - (CDV.DD + CDV.DW + CDV.DI + CDV.DR)/2;//(CDV.DD / 2) - (CDV.DW / 2) - (CDV.DI / 2)
      
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
    
    // Generate unique job ID for progress tracking
    const jobId = uuidv4();
    
    const taskId = await this.taskService.createTask(null, null, taskType, projectId, stage);

    if (taskId) {
      const task: any = {}
      task.status = 'IN_PROGRESS';
      task.updatedAt = new Date();

      await this.taskService.updateTask(taskId, task);
      
      // Initialize progress tracking
      this.progressService.updateProgress(
        jobId,
        'initialization',
        0,
        100,
        'Starting pension valuation...',
        { taskType, status: 'IN_PROGRESS' }
      );
      
      try {
        const valuationStage = stage.replace('Valuation_', '');
        const projectDetail = await this.findOne(projectId);

        // Update progress
        this.progressService.updateProgress(
          jobId,
          'data_preparation',
          10,
          100,
          'Preparing valuation data...',
          { taskType }
        );

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
          
          // Process demographic assumption rates (mortalityRate, withdrawalRate, illHealthRate)
          const demographicRateIds = [
            demographicAssumptions.mortalityRate,
            demographicAssumptions.withdrawalRate,
            demographicAssumptions.illHealthRate
          ].filter(id => id); // Filter out any undefined/null values
          
          if (demographicRateIds.length > 0) {
            const demographicRates = await this.decrementRateService.decrementRateByIds(demographicRateIds);
            
            // Transform and assign each demographic rate individually
            demographicRates.forEach(rate => {
              const ageValueList = rate.value.map((value, index) => ({
                age: rate.startingAge + index,
                value: value
              }));
              
              const processedRate = {
                id: (rate as any)._id?.toString() || rate.decrementRateName,
                name: rate.decrementRateName,
                rateType: rate.rateType,
                ageValueList: ageValueList
              };
              
              // Assign based on rate ID
              const rateId = (rate as any)._id?.toString();
              if (rateId === demographicAssumptions.mortalityRate) {
                stageValuationParams['MORTALITY_RATE'] = processedRate;
              } else if (rateId === demographicAssumptions.withdrawalRate) {
                stageValuationParams['WITHDRAWAL_RATE'] = processedRate;
              } else if (rateId === demographicAssumptions.illHealthRate) {
                stageValuationParams['ILL_HEALTH_RATE'] = processedRate;
              }
            });
          }
        } else {
          throw 'Assumptions does not exist!';
        }

        // Process commutation factors from Benefits Structure
        const benefitsStructure = stageValuationParams?.['Benefits Structure'];
        if (benefitsStructure?.commutationFactor) {
          const commutationFactorIds = benefitsStructure.commutationFactor.map(cf => cf.value);
          
          if (commutationFactorIds.length > 0) {
            const commutationFactorRates = await this.decrementRateService.decrementRateByIds(commutationFactorIds);
            
            // Transform commutation factors into age and value object lists
            const commutationFactors = commutationFactorRates.map(rate => {
              const ageValueList = rate.value.map((value, index) => ({
                age: rate.startingAge + index,
                ret_with_death: value
              }));
              
              return {
                id: (rate as any)._id?.toString() || rate.decrementRateName,
                name: rate.decrementRateName,
                rateType: rate.rateType,
                ageValueList: ageValueList
              };
            });
            
            stageValuationParams['COMMUTATION_FACTORS'] = commutationFactors;
          }
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
          if (projectDetail.valuations[stages[i]]?.['COMMUTATION_FACTORS']) {
            delete projectDetail.valuations[stages[i]]['COMMUTATION_FACTORS'];
          }
          if (projectDetail.valuations[stages[i]]?.['MORTALITY_RATE']) {
            delete projectDetail.valuations[stages[i]]['MORTALITY_RATE'];
          }
          if (projectDetail.valuations[stages[i]]?.['WITHDRAWAL_RATE']) {
            delete projectDetail.valuations[stages[i]]['WITHDRAWAL_RATE'];
          }
          if (projectDetail.valuations[stages[i]]?.['ILL_HEALTH_RATE']) {
            delete projectDetail.valuations[stages[i]]['ILL_HEALTH_RATE'];
          }

          const completedTasks: any[] = tasksByProjectAndTaskType.filter((t: any) => t.stage === `Valuation_${stages[i]}` && t.status === 'COMPLETED');
          completedTasks.forEach(async (completedTask) => {
            await this.taskService.updateTask(completedTask.id, {status: 'CANCELLED'});
          })
        }

        // Update projectId detail with the modified valuations
        await this.update(projectId, projectDetail);

        // Update progress before calling FastAPI
        this.progressService.updateProgress(
          jobId,
          'calculation',
          50,
          100,
          'Starting pension calculation...',
          { taskType }
        );

        // Call FastAPI endpoint
        try {
          const fastApiUrl = `${process.env.VALUATION_SERVER_URL}/projects/${projectId}/valuations/${valuationStage}/run-batch`;
          
          // Update progress
          this.progressService.updateProgress(
            jobId,
            'calculation',
            70,
            100,
            'Sending calculation request to valuation server...',
            { taskType }
          );
          
          const response = await axios.post(fastApiUrl, {
            project_id: projectId,
            valuation_stage: valuationStage,
            job_id: jobId // Pass job_id to FastAPI for progress tracking
          });
          
          console.log('FastAPI response:', response.data);
          
          // Update progress after calculation
          this.progressService.updateProgress(
            jobId,
            'finalizing',
            90,
            100,
            'Finalizing calculation results...',
            { taskType }
          );
          
        } catch (fastApiError) {
          console.error('FastAPI call failed:', fastApiError.message);
          
          // Report error through progress service
          this.progressService.errorJob(jobId, `FastAPI call failed: ${fastApiError.message}`);
          
          throw new Error(`FastAPI call failed: ${fastApiError.message}`);
        }

        task.status = 'COMPLETED';
        
        // Complete the job
        this.progressService.completeJob(jobId, {
          taskType,
          status: 'COMPLETED',
          message: 'Pension valuation completed successfully'
        });
        
      } catch (error) {
        task.descriptionType = 'ERROR';
        task.description = error.message;
        task.stacktrace = error.stack;
        task.status = 'FAILED';
        
        // Report error through progress service
        this.progressService.errorJob(jobId, error.message);
      }

      task.updatedAt = new Date();
      await this.taskService.updateTask(taskId, task);
    }

    // Return job_id for frontend to track progress
    return {
      data: taskId, 
      job_id: jobId,
      message: `Task created with ID: ${taskId}`,
      progress_endpoint: `/progress/${jobId}`
    };
  }

  async deleteValuations(projectId: string) {
    try {
      const projectDetail = await this.findOne(projectId);

      if (!projectDetail) {
        throw new NotFoundException(`Project with ID ${projectId} not found`);
      }

      // Check if the project has valuations
      if (!projectDetail.valuations || Object.keys(projectDetail.valuations).length === 0) {
        return { message: 'No valuations found to delete' };
      }

      // Clear all valuation data
      const stages = [
        'REPLICATION_RUN',
        'BASELINE_RUN',
        'SALARY_INCREASE_RATE_CHANGE',
        'INDEXATION_RATES_CHANGE',
        'DISCOUNT_RATES_CHANGE',
        'END_OF_YEAR_VALUATION'
      ];

      let deletedStages = [];

      // Clear valuation data for each stage
      stages.forEach(stage => {
        if (projectDetail.valuations[stage]) {
          // Clear all data types for this stage
          if (projectDetail.valuations[stage]['Data']) {
            delete projectDetail.valuations[stage]['Data'];
          }
          if (projectDetail.valuations[stage]['Benefits Structure']) {
            delete projectDetail.valuations[stage]['Benefits Structure'];
          }
          if (projectDetail.valuations[stage]['Assumptions']) {
            delete projectDetail.valuations[stage]['Assumptions'];
          }
          if (projectDetail.valuations[stage]['DECREMENT_TABLE']) {
            delete projectDetail.valuations[stage]['DECREMENT_TABLE'];
          }
          if (projectDetail.valuations[stage]['COMMUTATION_FACTORS']) {
            delete projectDetail.valuations[stage]['COMMUTATION_FACTORS'];
          }
          if (projectDetail.valuations[stage]['MORTALITY_RATE']) {
            delete projectDetail.valuations[stage]['MORTALITY_RATE'];
          }
          if (projectDetail.valuations[stage]['WITHDRAWAL_RATE']) {
            delete projectDetail.valuations[stage]['WITHDRAWAL_RATE'];
          }
          if (projectDetail.valuations[stage]['ILL_HEALTH_RATE']) {
            delete projectDetail.valuations[stage]['ILL_HEALTH_RATE'];
          }

          deletedStages.push(stage);
        }
      });

      // Cancel all related valuation tasks
      const taskType = 'PENSION_VALUATION';
      const tasksByProjectAndTaskType = await this.taskService.getTasksByProjectAndTaskType(projectId, taskType);
      
      const completedTasks: any[] = tasksByProjectAndTaskType.filter((t: any) => t.status === 'COMPLETED');
      await Promise.all(completedTasks.map(async (completedTask) => {
        await this.taskService.updateTask(completedTask.id, { status: 'CANCELLED' });
      }));

      // Update the project with cleared valuations
      await this.update(projectId, projectDetail);

      return {
        message: `Successfully deleted valuations for project ${projectId}`,
        deletedStages: deletedStages,
        cancelledTasks: completedTasks.length
      };

    } catch (error) {
      throw new Error(`Failed to delete valuations: ${error.message}`);
    }
  }
}
