import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProjectService } from '../../project-management/services/project.service';
import { CreateProjectFileDto } from '../dto/file-project.dto';
import { ProjectFile } from '../schemas/project-file.schema';
import * as crypto from 'crypto';

@Injectable()
export class ProjectFileService {
  constructor(
    @InjectModel(ProjectFile.name)
    private projectFileModel: Model<ProjectFile>,
    private projectService: ProjectService
  ) {}

  async create(createProjectFileDto: CreateProjectFileDto): Promise<ProjectFile> {
    const { project } = createProjectFileDto;
    if(project) {
      await this.projectService.findOne(project.toString());
    }
    const createdProjectFile = new this.projectFileModel(createProjectFileDto);
    return createdProjectFile.save();
  }

  async findAll(): Promise<ProjectFile[]> {
    return this.projectFileModel.find().exec();
  }

  async findById(id: string): Promise<ProjectFile> {
    return this.projectFileModel.findById(id).exec();
  }

  async update(id: string, updateProjectFileDto: CreateProjectFileDto): Promise<ProjectFile> {
    return this.projectFileModel.findByIdAndUpdate(id, updateProjectFileDto, { new: true }).exec();
  }

  async delete(id: string): Promise<ProjectFile> {
    return this.projectFileModel.findByIdAndDelete(id).exec();
  }

  generateMD5(data: string): string {
    const hash = crypto.createHash('md5').update(data).digest('hex');
    return hash;
  }

  async readFileByUrl(): Promise<any[]> {
    return Promise.resolve([])
  }
}
