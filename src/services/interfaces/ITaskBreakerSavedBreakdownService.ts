// src/services/interfaces/ITaskBreakerSavedBreakdownService.ts
import type { TaskBreakerSavedBreakdown, CreateTaskBreakerSavedBreakdownDTO } from '@/types';
import type { IService } from './IService';

export interface ITaskBreakerSavedBreakdownService extends IService<TaskBreakerSavedBreakdown, CreateTaskBreakerSavedBreakdownDTO> {
  // Any specific methods for saved breakdowns can be added here
}
