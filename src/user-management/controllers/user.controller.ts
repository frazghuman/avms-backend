import { Controller, Get, Post, Body, Param, Put, Delete, UsePipes, NotFoundException } from '@nestjs/common';
import { UserService } from '../services/user.service';
import { User } from '../schemas/user.schema';
import { Types } from 'mongoose';
import { JoiValidationPipe } from '../../common/pipes/joi-validation.pipe';
import * as Joi from 'joi';
import { RoleService } from '../services/role.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService, private readonly roleService: RoleService) {}

  @Post()
  @UsePipes(new JoiValidationPipe(Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    role: Joi.string().required(),
  })))
  async create(@Body() user: User): Promise<Types.ObjectId> {
    const { role } = user;
    const roleInfo = await this.roleService.findOne(role.toString());

    if (!roleInfo) {
      throw new NotFoundException(`Role with ID ${roleInfo._id} not found`);
    }
    return this.userService.createUser(user);
  }

  @Post('password/new')
  @UsePipes(new JoiValidationPipe(Joi.object({
    verificationKey: Joi.string().required(),
    password: Joi.string().required(),
  })))
  async updatePasswordByVerificationKey(@Body() user: User): Promise<Types.ObjectId> {
    const { verificationKey, password } = user;
    return this.userService.updatePasswordByVerificationKey(verificationKey, password);
  }

  @Get()
  async findAll(): Promise<User[]> {
    return this.userService.getAllUsers();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<User> {
    return this.userService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() user: User): Promise<User> {
    return this.userService.update(id, user);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<User> {
    return this.userService.remove(id);
  }
}
