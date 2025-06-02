// src/services/interfaces/IBrainDumpService.ts
import type { BrainDumpContent, CreateBrainDumpContentDTO } from '@/types';
import type { IService } from './IService';

export interface IBrainDumpService extends IService<BrainDumpContent, CreateBrainDumpContentDTO> {
  // Potentially get latest if only one brain dump is active per user
  // getLatest(userId: string): Promise<BrainDumpContent | null>;
}