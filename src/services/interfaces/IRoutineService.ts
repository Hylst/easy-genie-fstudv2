// src/services/interfaces/IRoutineService.ts
import type { Routine, CreateRoutineDTO, RoutineStep, CreateRoutineStepDTO } from '@/types';
import type { IService } from './IService';

export interface IRoutineService extends IService<Routine, CreateRoutineDTO> {
  // Methods for managing routine steps associated with a routine
  getStepsForRoutine(routineId: string, userId: string): Promise<RoutineStep[]>;
  addStepToRoutine(routineId: string, stepData: CreateRoutineStepDTO, userId: string): Promise<RoutineStep>;
  updateRoutineStep(stepId: string, stepData: Partial<CreateRoutineStepDTO>, userId: string): Promise<RoutineStep>;
  deleteRoutineStep(stepId: string, userId: string): Promise<void>;
}
