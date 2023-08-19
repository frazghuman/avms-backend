import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TargetProject, TargetProjectDocument } from '../schemas/target-project.schema';
import { CreateTargetProjectDto, UpdateTargetProjectDto } from '../dto/target-project.dto';
import { TargetEntityService } from './target-entity.service';
import { ProjectService } from './project.service';
import { UserService } from '../../user-management/services/user.service';

@Injectable()
export class TargetProjectService {
  constructor(
    @InjectModel(TargetProject.name) private targetProjectModel: Model<TargetProjectDocument>,
    private targetEntityService: TargetEntityService,
    private projectService: ProjectService,
    private userService: UserService
  ) {}

  async findAll(): Promise<TargetProject[]> {
    return this.targetProjectModel.find()
      .populate('project', 'name description startDate endDate status')
      .populate('targetEntities', 'name alias')
      .populate('ProjectFile', 'filename originalname mimetype headerRow headerRowNo sheetName size uploadDate md5')
      .populate('teamMembers', 'name email')
      .exec();
  }

  async findById(id: string): Promise<TargetProject> {
    return this.targetProjectModel.findById(id)
      .populate('project', 'name description startDate endDate status')
      .populate('targetEntities', 'name alias')
      .populate('ProjectFile', 'filename originalname mimetype headerRow headerRowNo sheetName size uploadDate md5')
      .populate('teamMembers', 'name email')
      .exec();
  }

  async create(createTargetProjectDto: CreateTargetProjectDto): Promise<TargetProject> {
    const { targetEntities, project, teamMembers } = createTargetProjectDto;
    await this.validateRelationalIds(targetEntities, project, teamMembers);

    const createdTargetProject = new this.targetProjectModel(createTargetProjectDto);
    return createdTargetProject.save();
  }

  async update(id: string, updateTargetProjectDto: UpdateTargetProjectDto): Promise<TargetProject> {
    const { targetEntities, project, teamMembers } = updateTargetProjectDto;
    await this.validateRelationalIds(targetEntities, project, teamMembers);

    return this.targetProjectModel.findByIdAndUpdate(id, updateTargetProjectDto, { new: true }).exec();
  }

  async delete(id: string): Promise<TargetProject> {
    return this.targetProjectModel.findByIdAndDelete(id).exec();
  }

  async validateRelationalIds(targetEntities, project, teamMembers) {
    if (targetEntities) {
      targetEntities.forEach(async targetEntity => {
        const targetEntitiyInfo = await this.targetEntityService.findById(targetEntity.toString());
    
        if (!targetEntitiyInfo) {
          throw new NotFoundException(`TargetEntity with ID ${targetEntitiyInfo._id} not found`);
        }
      })
    }
    if(project) {
      await this.projectService.findOne(project.toString());
    }
    if(teamMembers) {
      teamMembers.forEach(async teamMember => {
        const teamMemberInfo = await this.userService.findOne(teamMember.toString());
    
        if (!teamMemberInfo) {
          throw new NotFoundException(`TeamMember with ID ${teamMemberInfo._id} not found`);
        }
      })
    }
  }
}
