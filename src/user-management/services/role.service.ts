import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role, RoleDocument } from '../schemas/role.schema';

@Injectable()
export class RoleService {
  constructor(@InjectModel(Role.name) private roleModel: Model<RoleDocument>) {}

  async create(role: Role): Promise<Types.ObjectId> {
    const createdRole = new this.roleModel(role);
    const {_id} = await createdRole.save();
    return Promise.resolve(_id);
  }

  async findAll(): Promise<Role[]> {
    return this.roleModel.find().exec();
  }

  async findOne(id: string): Promise<Role> {
    return this.roleModel.findById(id).exec();
  }

  async update(id: string, role: Role): Promise<Role> {
    return this.roleModel.findByIdAndUpdate(id, role, { new: true }).exec();
  }

  async remove(id: string): Promise<Role> {
    return this.roleModel.findByIdAndRemove(id).exec();
  }
}
