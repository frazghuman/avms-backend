import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project, ProjectDocument } from '../schemas/project.schema';
import { ProjectDto } from '../dto/project.dto';
import { ObjectId } from 'mongodb';

@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<ProjectDocument>,
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
}
