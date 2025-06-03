
// src/services/interfaces/ITaskBreakerCustomPresetService.ts
import type { TaskBreakerCustomPreset, CreateTaskBreakerCustomPresetDTO } from '@/types';
import type { IService } from './IService';

export interface ITaskBreakerCustomPresetService extends IService<TaskBreakerCustomPreset, CreateTaskBreakerCustomPresetDTO> {
  // Any specific methods for custom presets can be added here
}
