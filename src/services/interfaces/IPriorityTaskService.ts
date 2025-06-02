
// src/services/interfaces/IPriorityTaskService.ts
import type { PriorityTask, CreatePriorityTaskDTO } from '@/types';
import type { IService } from './IService';

export interface IPriorityTaskService extends IService<PriorityTask, CreatePriorityTaskDTO> {
  // Specific methods for PriorityTask can be added here if any
  // For example:
  // getTasksByQuadrant(quadrant: PriorityTask['quadrant'], userId: string): Promise<PriorityTask[]>;
}
