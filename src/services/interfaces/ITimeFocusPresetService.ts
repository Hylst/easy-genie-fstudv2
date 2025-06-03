
// src/services/interfaces/ITimeFocusPresetService.ts
import type { TimeFocusPreset, CreateTimeFocusPresetDTO } from '@/types';
import type { IService } from './IService';

export interface ITimeFocusPresetService extends IService<TimeFocusPreset, CreateTimeFocusPresetDTO> {
  // Any specific methods for TimeFocus presets can be added here
}
