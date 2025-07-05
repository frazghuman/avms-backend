import * as protoLoader from '@grpc/proto-loader';
import * as grpc from '@grpc/grpc-js';
import { join } from 'path';

// Path to the proto file - adjust as needed
const PROTO_PATH = join(__dirname, '../../../avms-fastapi-docker/proto/env.proto');

// Define interface for our gRPC service
interface EnvService {
  getPath: (request: {}, callback: (error: Error | null, response: { value: string }) => void) => void;
  getPort: (request: {}, callback: (error: Error | null, response: { value: string }) => void) => void;
}

// Define interface for gRPC client constructor
interface EnvServiceClient {
  new(address: string, credentials: grpc.ChannelCredentials): EnvService;
}

// Load the proto file
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

// Load the package definition
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;

// Access the EnvService service and cast it to the right type
const envService = protoDescriptor.env.EnvService as EnvServiceClient;

// Export the client constructor with proper typing
export const EnvServiceClient = envService;

// Export an empty message creator for convenience
export function createEmpty() {
  return {};
}