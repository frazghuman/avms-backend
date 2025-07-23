import { Injectable, Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

export interface ProgressUpdate {
  job_id: string;
  stage: string;
  current: number;
  total: number;
  percentage: number;
  message: string;
  timestamp: number;
  completed?: boolean;
  error?: boolean;
  taskType?: string;
  fileType?: string;
  processedEmployees?: number;
  totalEmployees?: number;
  status?: string;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  namespace: '/progress',
})
export class ProgressService implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ProgressService.name);
  private jobProgress = new Map<string, ProgressUpdate>();
  private activeJobs = new Set<string>();
  private jobSockets = new Map<string, Set<Socket>>();

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Clean up job subscriptions for this client
    for (const [jobId, sockets] of this.jobSockets.entries()) {
      sockets.delete(client);
      if (sockets.size === 0) {
        this.jobSockets.delete(jobId);
      }
    }
  }

  @SubscribeMessage('subscribe_job')
  handleSubscribeJob(@ConnectedSocket() client: Socket, @MessageBody() data: { jobId: string }) {
    const { jobId } = data;
    this.logger.log(`Client ${client.id} subscribed to job: ${jobId}`);
    
    if (!this.jobSockets.has(jobId)) {
      this.jobSockets.set(jobId, new Set());
    }
    this.jobSockets.get(jobId)!.add(client);
    
    // Send current progress if available
    const currentProgress = this.jobProgress.get(jobId);
    if (currentProgress) {
      client.emit('progress_update', currentProgress);
    }
    
    client.emit('subscription_confirmed', { jobId, status: 'subscribed' });
  }

  @SubscribeMessage('unsubscribe_job')
  handleUnsubscribeJob(@ConnectedSocket() client: Socket, @MessageBody() data: { jobId: string }) {
    const { jobId } = data;
    this.logger.log(`Client ${client.id} unsubscribed from job: ${jobId}`);
    
    const sockets = this.jobSockets.get(jobId);
    if (sockets) {
      sockets.delete(client);
      if (sockets.size === 0) {
        this.jobSockets.delete(jobId);
      }
    }
    
    client.emit('unsubscription_confirmed', { jobId, status: 'unsubscribed' });
  }

  // Method to send progress updates
  updateProgress(
    jobId: string,
    stage: string,
    current: number,
    total: number,
    message: string = '',
    additionalData: Partial<ProgressUpdate> = {}
  ) {
    const progressData: ProgressUpdate = {
      job_id: jobId,
      stage,
      current,
      total,
      percentage: total > 0 ? Math.round((current / total) * 100) : 0,
      message,
      timestamp: Date.now(),
      ...additionalData,
    };

    this.jobProgress.set(jobId, progressData);
    this.activeJobs.add(jobId);
    
    // Emit progress event to subscribed clients
    this.emitToJobClients(jobId, 'progress_update', progressData);
    
    this.logger.debug(`Progress updated for job ${jobId}: ${progressData.percentage}%`);
    
    return progressData;
  }

  // Method to complete a job
  completeJob(jobId: string, resultData?: any) {
    const completionData: ProgressUpdate = {
      job_id: jobId,
      stage: 'completed',
      current: 100,
      total: 100,
      percentage: 100,
      message: 'Job completed successfully',
      timestamp: Date.now(),
      completed: true,
      ...resultData,
    };

    this.jobProgress.set(jobId, completionData);
    this.emitToJobClients(jobId, 'progress_update', completionData);
    
    this.logger.log(`Job completed: ${jobId}`);

    // Clean up after a delay
    setTimeout(() => {
      this.jobProgress.delete(jobId);
      this.activeJobs.delete(jobId);
      this.jobSockets.delete(jobId);
    }, 30000); // Keep for 30 seconds

    return completionData;
  }

  // Method to mark job as failed
  errorJob(jobId: string, errorMessage: string) {
    const errorData: ProgressUpdate = {
      job_id: jobId,
      stage: 'error',
      current: 0,
      total: 100,
      percentage: 0,
      message: errorMessage,
      timestamp: Date.now(),
      error: true,
    };

    this.jobProgress.set(jobId, errorData);
    this.emitToJobClients(jobId, 'progress_update', errorData);
    
    this.logger.error(`Job failed: ${jobId} - ${errorMessage}`);

    // Clean up after a delay
    setTimeout(() => {
      this.jobProgress.delete(jobId);
      this.activeJobs.delete(jobId);
      this.jobSockets.delete(jobId);
    }, 10000); // Keep for 10 seconds

    return errorData;
  }

  // Helper method to emit to all clients subscribed to a specific job
  private emitToJobClients(jobId: string, event: string, data: any) {
    const sockets = this.jobSockets.get(jobId);
    if (sockets && sockets.size > 0) {
      sockets.forEach(socket => {
        socket.emit(event, data);
      });
      this.logger.debug(`Emitted ${event} to ${sockets.size} clients for job ${jobId}`);
    } else {
      this.logger.debug(`No clients subscribed to job ${jobId}`);
    }
  }

  // Get progress for a job
  getProgress(jobId: string): ProgressUpdate | null {
    return this.jobProgress.get(jobId) || null;
  }

  // Check if job is active
  isJobActive(jobId: string): boolean {
    return this.activeJobs.has(jobId);
  }

  // Get all active jobs
  getActiveJobs(): string[] {
    return Array.from(this.activeJobs);
  }

  // Get all job progress
  getAllProgress(): Map<string, ProgressUpdate> {
    return new Map(this.jobProgress);
  }
}
