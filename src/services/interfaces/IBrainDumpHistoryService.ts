
// src/services/interfaces/IBrainDumpHistoryService.ts
import type { BrainDumpHistoryEntry, CreateBrainDumpHistoryEntryDTO } from '@/types';
import type { IService } from './IService';

export interface IBrainDumpHistoryService extends IService<BrainDumpHistoryEntry, CreateBrainDumpHistoryEntryDTO> {
  // Any specific methods for BrainDump history can be added here
}
