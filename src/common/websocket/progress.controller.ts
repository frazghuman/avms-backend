import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { ProgressService } from './progress.gateway';

@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get(':jobId')
  getJobProgress(@Param('jobId') jobId: string) {
    const progress = this.progressService.getProgress(jobId);
    
    if (!progress) {
      return {
        job_id: jobId,
        stage: 'not_found',
        current: 0,
        total: 100,
        percentage: 0,
        message: 'Job not found',
        timestamp: Date.now(),
        error: true,
      };
    }

    return progress;
  }

  @Get()
  getAllActiveJobs() {
    return {
      activeJobs: this.progressService.getActiveJobs(),
      progress: Object.fromEntries(this.progressService.getAllProgress()),
    };
  }

  @Post('update')
  updateProgress(@Body() progressData: {
    job_id: string;
    stage: string;
    current: number;
    total: number;
    percentage?: number;
    message: string;
    timestamp?: number;
    completed?: boolean;
    error?: boolean;
    taskType?: string;
    fileType?: string;
    processedEmployees?: number;
    totalEmployees?: number;
    status?: string;
  }) {
    // Receive progress updates from external services (like FastAPI) and broadcast via WebSocket
    const {
      job_id,
      stage,
      current,
      total,
      message,
      completed,
      error,
      taskType,
      fileType,
      processedEmployees,
      totalEmployees,
      status,
      ...additionalData
    } = progressData;

    if (error) {
      // Handle error case
      this.progressService.errorJob(job_id, message);
    } else if (completed) {
      // Handle completion case
      this.progressService.completeJob(job_id, {
        taskType,
        fileType,
        status: status || 'COMPLETED',
        processedEmployees,
        totalEmployees,
        ...additionalData
      });
    } else {
      // Handle progress update
      this.progressService.updateProgress(
        job_id,
        stage,
        current,
        total,
        message,
        {
          taskType,
          fileType,
          processedEmployees,
          totalEmployees,
          status: status || 'IN_PROGRESS',
          ...additionalData
        }
      );
    }

    return {
      success: true,
      message: 'Progress update received and broadcasted',
      job_id
    };
  }

  @Post('test/:jobId')
  testProgress(@Param('jobId') jobId: string, @Body() body: any) {
    // Test progress updates for WebSocket connection
    const stages = [
      { stage: 'initialization', progress: 10, message: 'Initializing test...' },
      { stage: 'processing', progress: 30, message: 'Processing data...' },
      { stage: 'calculation', progress: 60, message: 'Performing calculations...' },
      { stage: 'validation', progress: 80, message: 'Validating results...' },
      { stage: 'completion', progress: 100, message: 'Test completed!' },
    ];

    let currentStage = 0;
    
    const sendUpdate = () => {
      if (currentStage < stages.length) {
        const { stage, progress, message } = stages[currentStage];
        
        this.progressService.updateProgress(
          jobId,
          stage,
          progress,
          100,
          message,
          {
            taskType: 'TEST_PROGRESS',
            status: progress === 100 ? 'COMPLETED' : 'IN_PROGRESS',
            completed: progress === 100,
          }
        );

        currentStage++;
        
        if (progress === 100) {
          this.progressService.completeJob(jobId, { testResult: 'Success' });
        } else {
          setTimeout(sendUpdate, 1000); // Send next update after 1 second
        }
      }
    };

    // Start sending updates
    setTimeout(sendUpdate, 500);

    return {
      success: true,
      message: 'Test progress started',
      jobId,
      trackingUrl: `/progress/${jobId}`,
    };
  }
}
