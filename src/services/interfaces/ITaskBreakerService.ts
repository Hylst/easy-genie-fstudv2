
// src/services/interfaces/ITaskBreakerService.ts
import type { TaskBreakerTask, CreateTaskBreakerTaskDTO } from '@/types';
import type { IService } from './IService';

export interface ITaskBreakerService extends IService<TaskBreakerTask, CreateTaskBreakerTaskDTO> {
  getTasksByParent(parentId: string | null, userId: string): Promise<TaskBreakerTask[]>;
  