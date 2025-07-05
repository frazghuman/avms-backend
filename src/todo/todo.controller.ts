import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Todo } from './todo.schema';
import { TodoService } from './todo.service';
import { credentials } from '@grpc/grpc-js';

// Import our gRPC client helper
import { EnvServiceClient, createEmpty } from '../grpc/env-client';

@Controller('todos')
export class TodoController {
  private grpcClient: any;

  constructor(
    private readonly todoService: TodoService,
    private readonly configService: ConfigService,
  ) {
    // Initialize the gRPC client using ConfigService
    const grpcClientPath = this.configService.get<string>(
      'GRPC_CLIENT_PATH',
      'localhost:50051',
    );
    this.grpcClient = new EnvServiceClient(
      grpcClientPath,
      credentials.createInsecure(),
    );
  }

  @Post()
  async create(@Body() todo: Todo): Promise<Todo> {
    return this.todoService.create(todo);
  }

  @Get()
  async findAll(): Promise<Todo[]> {
    return this.todoService.findAll();
  }

  @Get('python/env-path')
  async getEnvPath() {
    return new Promise((resolve, reject) => {
      this.grpcClient.getPath(createEmpty(), (error, response) => {
        if (error) {
          console.error('Error calling gRPC service:', error);
          reject(error);
        } else {
          resolve({ path: response.value });
        }
      });
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Todo> {
    return this.todoService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() todo: Todo): Promise<Todo> {
    return this.todoService.update(id, todo);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<Todo> {
    return this.todoService.delete(id);
  }
}
