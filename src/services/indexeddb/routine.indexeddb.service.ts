
// src/services/indexeddb/routine.indexeddb.service.ts
"use client";

import type { IRoutineService } from '../interfaces/IRoutineService';
import type { Routine, CreateRoutineDTO, RoutineStep, CreateRoutineStepDTO } from '@/types';
import { getDb } from './db';
import Dexie from 'dexie';

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
    return this.getRoutineTable()
      .where({ user_id: userId })
      .filter(routine => routine.sync_status !== 'deleted')
      .sortBy('created_at');
  }

  async getById(id: string, userId: string): Promise<Routine | null> {
    if (!userId) {
      console.warn("RoutineIndexedDBService.getRoutineById: userId is required.");
      return null;
    }
    const routine = await this.getRoutineTable().get(id);
    // Do not filter by sync_status here, as sync logic might need to access 'deleted' items
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
      sync_status: 'new',
      last_synced_at: undefined,
    };
    await this.getRoutineTable().add(newRoutine);
    return newRoutine;
  }

  async update(id: string, data: Partial<CreateRoutineDTO>, userId: string): Promise<Routine> {
    if (!userId) {
      throw new Error("RoutineIndexedDBService.updateRoutine: userId is required.");
    }
    const existingRoutine = await this.getRoutineTable().get(id); // get directly to check original sync_status
    if (!existingRoutine || existingRoutine.user_id !== userId) {
      throw new Error('Routine not found or access denied for update.');
    }
    const now = new Date().toISOString();
    const updatedRoutineData: Routine = {
      ...existingRoutine,
      ...data,
      updated_at: now,
      sync_status: existingRoutine.sync_status === 'new' ? 'new' : 'updated',
    };
    await this.getRoutineTable().put(updatedRoutineData);
    return updatedRoutineData;
  }

  async delete(id: string, userId: string): Promise<void> {
    if (!userId) {
      throw new Error("RoutineIndexedDBService.deleteRoutine: userId is required.");
    }
    const existingRoutine = await this.getRoutineTable().get(id);
    if (!existingRoutine || existingRoutine.user_id !== userId) {
      throw new Error('Routine not found or access denied for deletion.');
    }

    if (existingRoutine.sync_status === 'new') {
      // Hard delete associated steps first
      await this.getRoutineStepTable().where({ routine_id: id, user_id: userId }).delete();
      await this.getRoutineTable().delete(id); // Hard delete the routine
    } else {
      // Soft delete associated steps
      const stepsToSoftDelete = await this.getRoutineStepTable().where({ routine_id: id, user_id: userId }).toArray();
      for (const step of stepsToSoftDelete) {
        await this.deleteRoutineStep(step.id, userId); // This will soft delete if applicable
      }
      // Soft delete the routine
      await this.getRoutineTable().update(id, { sync_status: 'deleted', updated_at: new Date().toISOString() });
    }
  }

  // --- RoutineStep Methods ---
  async getStepsForRoutine(routineId: string, userId: string): Promise<RoutineStep[]> {
    if (!userId) {
      console.warn("RoutineIndexedDBService.getStepsForRoutine: userId is required. Returning empty array.");
      return [];
    }
    return this.getRoutineStepTable()
      .where({ routine_id: routineId, user_id: userId })
      .filter(step => step.sync_status !== 'deleted')
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
      sync_status: 'new',
      last_synced_at: undefined,
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
      sync_status: existingStep.sync_status === 'new' ? 'new' : 'updated',
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
    if (existingStep.sync_status === 'new') {
      await this.getRoutineStepTable().delete(stepId); // Hard delete
    } else {
      await this.getRoutineStepTable().update(stepId, { sync_status: 'deleted', updated_at: new Date().toISOString() }); // Soft delete
    }
  }

  // --- Sync Helper Methods for Routines & Steps ---
  async getPendingRoutines(userId: string): Promise<Routine[]> {
    return this.getRoutineTable()
      .where({ user_id: userId })
      .and(routine => ['new', 'updated', 'deleted'].includes(routine.sync_status!))
      .toArray();
  }
  
  async getPendingRoutineSteps(userId: string): Promise<RoutineStep[]> {
     // Fetch steps that are pending themselves OR belong to a routine that is 'new' (and thus steps are implicitly new for the server)
    const pendingSteps = await this.getRoutineStepTable()
      .where({ user_id: userId })
      .and(step => ['new', 'updated', 'deleted'].includes(step.sync_status!))
      .toArray();
    
    const newRoutines = await this.getRoutineTable().where({ user_id: userId, sync_status: 'new' }).toArray();
    const newRoutineIds = new Set(newRoutines.map(r => r.id));

    const stepsOfNewRoutines = await this.getRoutineStepTable()
        .where({ user_id: userId })
        .and(step => newRoutineIds.has(step.routine_id) && step.sync_status !== 'deleted') // if routine is new, all its non-deleted steps are new to server
        .toArray();
    
    const allPendingSteps = new Map<string, RoutineStep>();
    pendingSteps.forEach(s => allPendingSteps.set(s.id, s));
    stepsOfNewRoutines.forEach(s => { // Override with step from new routine if not already more specifically pending
        if (!allPendingSteps.has(s.id) || allPendingSteps.get(s.id)!.sync_status !== 'deleted') {
             allPendingSteps.set(s.id, {...s, sync_status: 'new' }); // Mark as new if routine is new
        }
    });

    return Array.from(allPendingSteps.values());
  }


  async updateRoutineSyncStatus(id: string, serverTimestamp: string, newServerId?: string): Promise<void> {
    const updateData: Partial<Routine> = {
      sync_status: 'synced',
      last_synced_at: serverTimestamp,
      updated_at: serverTimestamp, // Assume server's timestamp is canonical
    };
    if (newServerId && newServerId !== id) {
      // This handles case where server might assign a new ID, though unlikely with UUIDs
      // This would be complex as it requires updating foreign keys in steps.
      // For now, assume ID remains consistent. If newServerId is different, it implies potential issues.
      console.warn(`Routine sync for ID ${id} received new server ID ${newServerId}. This is not fully handled yet.`);
      // A more robust solution would involve deleting the old local ID and re-adding with newServerId,
      // then finding all steps for old routineId and updating their routine_id to newServerId.
      // For simplicity, we'll update in place, assuming ID consistency.
      // If ID changes, that would require a more complex migration.
      await this.getRoutineTable().update(id, {...updateData, id: newServerId});
      // Update routine_id for all associated steps
      const steps = await this.getRoutineStepTable().where({routine_id: id}).toArray();
      for(const step of steps) {
          await this.getRoutineStepTable().update(step.id, {routine_id: newServerId});
      }

    } else {
        await this.getRoutineTable().update(id, updateData);
    }
  }

  async updateRoutineStepSyncStatus(id: string, serverTimestamp: string, newServerId?: string): Promise<void> {
     const updateData: Partial<RoutineStep> = {
      sync_status: 'synced',
      last_synced_at: serverTimestamp,
      updated_at: serverTimestamp,
    };
     if (newServerId && newServerId !== id) {
        await this.getRoutineStepTable().update(id, {...updateData, id: newServerId});
     } else {
        await this.getRoutineStepTable().update(id, updateData);
     }
  }
  
  async hardDeleteRoutine(id: string): Promise<void> {
    // Also hard delete associated steps
    await this.getRoutineStepTable().where({ routine_id: id }).delete();
    await this.getRoutineTable().delete(id);
  }

  async hardDeleteRoutineStep(id: string): Promise<void> {
    await this.getRoutineStepTable().delete(id);
  }

  async bulkUpdateRoutines(routines: Routine[]): Promise<void> {
    if (routines.length === 0) return;
    await getDb().transaction('rw', this.getRoutineTable(), async () => {
      await this.getRoutineTable().bulkPut(routines.map(r => ({...r, sync_status: 'synced', last_synced_at: r.updated_at })));
    });
  }
  async bulkUpdateRoutineSteps(steps: RoutineStep[]): Promise<void> {
    if (steps.length === 0) return;
     await getDb().transaction('rw', this.getRoutineStepTable(), async () => {
      await this.getRoutineStepTable().bulkPut(steps.map(s => ({...s, sync_status: 'synced', last_synced_at: s.updated_at })));
    });
  }
}
