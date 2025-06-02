
// src/services/indexeddb/routine.indexeddb.service.ts
"use client";

import type { IRoutineService } from '../interfaces/IRoutineService';
import type { Routine, CreateRoutineDTO, RoutineStep, CreateRoutineStepDTO } from '@/types';
import { getDb } from './db';

export class RoutineIndexedDBService implements IRoutineService {
  private getRoutineTable() {
    return getDb().routines;
  }

  private getRoutineStepTable() {
    return getDb().routineSteps;
  }

  // --- Routine Methods ---
  async getAll(userId: string): Promise<Routine[]> {
    if (!userId) {
      console.warn("RoutineIndexedDBService.getAllRoutines: userId is required. Returning empty array.");
      return [];
    }
    return this.getRoutineTable().where({ user_id: userId }).sortBy('created_at');
  }

  async getById(id: string, userId: string): Promise<Routine | null> {
    if (!userId) {
      console.warn("RoutineIndexedDBService.getRoutineById: userId is required.");
      return null;
    }
    const routine = await this.getRoutineTable().get(id);
    return (routine && routine.user_id === userId) ? routine : null;
  }

  async add(data: CreateRoutineDTO, userId: string): Promise<Routine> {
    if (!userId) {
      throw new Error("RoutineIndexedDBService.addRoutine: userId is required.");
    }
    const now = new Date().toISOString();
    const newRoutine: Routine = {
      ...data,
      id: crypto.randomUUID(),
      user_id: userId,
      created_at: now,
      updated_at: now,
    };
    await this.getRoutineTable().add(newRoutine);
    return newRoutine;
  }

  async update(id: string, data: Partial<CreateRoutineDTO>, userId: string): Promise<Routine> {
    if (!userId) {
      throw new Error("RoutineIndexedDBService.updateRoutine: userId is required.");
    }
    const existingRoutine = await this.getById(id, userId);
    if (!existingRoutine) {
      throw new Error('Routine not found or access denied for update.');
    }
    const now = new Date().toISOString();
    const updatedRoutineData: Routine = {
      ...existingRoutine,
      ...data,
      updated_at: now,
    };
    await this.getRoutineTable().put(updatedRoutineData);
    return updatedRoutineData;
  }

  async delete(id: string, userId: string): Promise<void> {
    if (!userId) {
      throw new Error("RoutineIndexedDBService.deleteRoutine: userId is required.");
    }
    const existingRoutine = await this.getById(id, userId);
    if (!existingRoutine) {
      throw new Error('Routine not found or access denied for deletion.');
    }
    // Also delete associated steps
    await this.getRoutineStepTable().where({ routine_id: id, user_id: userId }).delete();
    await this.getRoutineTable().delete(id);
  }

  // --- RoutineStep Methods ---
  async getStepsForRoutine(routineId: string, userId: string): Promise<RoutineStep[]> {
    if (!userId) {
      console.warn("RoutineIndexedDBService.getStepsForRoutine: userId is required. Returning empty array.");
      return [];
    }
    return this.getRoutineStepTable()
      .where({ routine_id: routineId, user_id: userId })
      .sortBy('order');
  }

  async addStepToRoutine(routineId: string, stepData: CreateRoutineStepDTO, userId: string): Promise<RoutineStep> {
    if (!userId) {
      throw new Error("RoutineIndexedDBService.addStepToRoutine: userId is required.");
    }
     if (stepData.routine_id !== routineId) {
      throw new Error("Routine ID in stepData does not match the provided routineId.");
    }
    const now = new Date().toISOString();
    const newStep: RoutineStep = {
      ...stepData,
      id: crypto.randomUUID(),
      user_id: userId,
      isCompleted: stepData.isCompleted ?? false,
      created_at: now,
      updated_at: now,
    };
    await this.getRoutineStepTable().add(newStep);
    return newStep;
  }

  async updateRoutineStep(stepId: string, stepData: Partial<CreateRoutineStepDTO>, userId: string): Promise<RoutineStep> {
     if (!userId) {
      throw new Error("RoutineIndexedDBService.updateRoutineStep: userId is required.");
    }
    const existingStep = await this.getRoutineStepTable().get(stepId);
    if (!existingStep || existingStep.user_id !== userId) {
      throw new Error('RoutineStep not found or access denied for update.');
    }
    const now = new Date().toISOString();
    const updatedStepData: RoutineStep = {
      ...existingStep,
      ...stepData,
      updated_at: now,
    };
    await this.getRoutineStepTable().put(updatedStepData);
    return updatedStepData;
  }

  async deleteRoutineStep(stepId: string, userId: string): Promise<void> {
    if (!userId) {
      throw new Error("RoutineIndexedDBService.deleteRoutineStep: userId is required.");
    }
    const existingStep = await this.getRoutineStepTable().get(stepId);
     if (!existingStep || existingStep.user_id !== userId) {
      throw new Error('RoutineStep not found or access denied for deletion.');
    }
    await this.getRoutineStepTable().delete(stepId);
  }
}
