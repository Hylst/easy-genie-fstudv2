
// src/services/appDataService.ts
"use client"; 

import { PriorityTaskIndexedDBService } from './indexeddb/priority-task.indexeddb.service';
import { PriorityTaskSupabaseService } from './supabase/priority-task.supabase.service';
import type { IPriorityTaskService } from './interfaces/IPriorityTaskService';
import type { PriorityTask, CreatePriorityTaskDTO } from '@/types';

import { RoutineIndexedDBService } from './indexeddb/routine.indexeddb.service';
import { RoutineSupabaseService } from './supabase/routine.supabase.service';
import type { IRoutineService } from './interfaces/IRoutineService';
import type { Routine, CreateRoutineDTO, RoutineStep, CreateRoutineStepDTO } from '@/types';

import { BrainDumpIndexedDBService } from './indexeddb/brain-dump.indexeddb.service';
import { BrainDumpSupabaseService } from './supabase/brain-dump.supabase.service';
import type { IBrainDumpService } from './interfaces/IBrainDumpService';
import type { BrainDumpContent, CreateBrainDumpContentDTO } from '@/types';

import { TaskBreakerIndexedDBService } from './indexeddb/task-breaker.indexeddb.service';
import { TaskBreakerSupabaseService } from './supabase/task-breaker.supabase.service';
import type { ITaskBreakerService } from './interfaces/ITaskBreakerService';
import type { TaskBreakerTask, CreateTaskBreakerTaskDTO } from '@/types';

import { toast } from '@/hooks/use-toast';


// --- Configuration ---
let _isOnline = true; 
let _currentUserId: string | null = null;
let _isSynchronizing = false;


export function setOnlineStatus(isOnline: boolean) {
  _isOnline = isOnline;
  console.log(`AppDataService: Online status set to ${_isOnline}`);
  if (_isOnline && _currentUserId) {
    synchronizeAllData(_currentUserId).catch(error => {
      console.error("Error during auto-sync on online status change:", error);
      toast({ title: "Erreur de Synchronisation Automatique", description: "Certaines données n'ont pu être synchronisées.", variant: "destructive"});
    });
  }
}

export function getOnlineStatus(): boolean {
  return _isOnline;
}

export function setCurrentUserId(userId: string | null) {
  _currentUserId = userId;
  console.log(`AppDataService: Current user ID set to ${_currentUserId}`);
}

export function getCurrentUserId(): string | null {
    return _currentUserId;
}


// --- Service Instances ---
const priorityTaskIndexedDBService = new PriorityTaskIndexedDBService();
const priorityTaskSupabaseService = new PriorityTaskSupabaseService();
const routineIndexedDBService = new RoutineIndexedDBService();
const routineSupabaseService = new RoutineSupabaseService();
const brainDumpIndexedDBService = new BrainDumpIndexedDBService();
const brainDumpSupabaseService = new BrainDumpSupabaseService();
const taskBreakerIndexedDBService = new TaskBreakerIndexedDBService();
const taskBreakerSupabaseService = new TaskBreakerSupabaseService();


// --- Helper to get current user ID or throw error ---
function getRequiredUserId(): string {
    const userId = getCurrentUserId();
    if (!userId) {
        throw new Error("User ID is required for this operation, but none is set.");
    }
    return userId;
}

// --- PriorityTask Operations ---
// getPriorityTaskService is internal, external calls use AppDataService methods
async function handleOnlineOperation<T, DTO>(
  localService: { add: (data: DTO, userId: string) => Promise<T>; update: (id: string, data: Partial<DTO>, userId: string) => Promise<T>; delete: (id: string, userId: string) => Promise<void>; updateSyncStatus: (id: string, serverTimestamp: string, newServerId?: string) => Promise<void>; hardDelete?: (id: string) => Promise<void>; },
  remoteService: { add: (data: DTO, userId: string) => Promise<T & { id: string, updated_at: string }>; update: (id: string, data: Partial<DTO>, userId: string) => Promise<T & { id: string, updated_at: string }>; delete: (id: string, userId: string) => Promise<void>; },
  operation: 'add' | 'update' | 'delete',
  id: string | null, // null for add
  data: DTO | Partial<DTO> | null, // null for delete
  userId: string
): Promise<T | void> {
  if (_isOnline && userId) {
    try {
      let result: T | void;
      let serverEntity: (T & { id: string, updated_at: string }) | null = null;

      if (operation === 'add') {
        serverEntity = await remoteService.add(data as DTO, userId);
        result = serverEntity;
        // Ensure local add also occurs and is marked as synced
        // This might be redundant if sync pulls it, but good for immediate consistency if local service supports it.
        // Or, more simply, let the sync process handle full reconciliation.
        // For now, we update sync status of the locally added item.
        const localNewItem = await localService.add(data as DTO, userId); // it will be 'new'
        await localService.updateSyncStatus(localNewItem.id, serverEntity.updated_at, serverEntity.id);

      } else if (operation === 'update' && id && data) {
        serverEntity = await remoteService.update(id, data as Partial<DTO>, userId);
        result = serverEntity;
        await localService.updateSyncStatus(id, serverEntity.updated_at);
      } else if (operation === 'delete' && id) {
        await remoteService.delete(id, userId);
        if (localService.hardDelete) {
          await localService.hardDelete(id);
        } else {
          // If no hardDelete, we assume the standard delete handles it or it's an error in interface.
          // This path is for when server op succeeds.
          await localService.delete(id, userId); 
        }
        return; // No entity to return
      } else {
        throw new Error("Invalid operation parameters for handleOnlineOperation");
      }
      return result;
    } catch (error) {
      console.warn(`Online operation '${operation}' failed, falling back to local. Error:`, error);
      toast({ title: "Mode En Ligne - Opération échouée", description: `Sauvegarde locale en attente de synchronisation. Erreur: ${(error as Error).message}`, variant: "default", duration: 7000 });
      // Fallback to local operation with pending sync status
      if (operation === 'add') return localService.add(data as DTO, userId);
      if (operation === 'update' && id && data) return localService.update(id, data as Partial<DTO>, userId);
      if (operation === 'delete' && id) return localService.delete(id, userId); // This will soft delete
      throw error; // Should not reach here if params are valid
    }
  } else {
    // Offline or no user: perform local operation, sync_status will be set by local service
    if (operation === 'add') return localService.add(data as DTO, userId);
    if (operation === 'update' && id && data) return localService.update(id, data as Partial<DTO>, userId);
    if (operation === 'delete' && id) return localService.delete(id, userId);
    throw new Error("User not logged in or operation parameters invalid for offline mode.");
  }
}


export async function getAllPriorityTasks(): Promise<PriorityTask[]> {
  const userId = getRequiredUserId();
  return priorityTaskIndexedDBService.getAll(userId);
}
export async function addPriorityTask(data: CreatePriorityTaskDTO): Promise<PriorityTask> {
  const userId = getRequiredUserId();
  return handleOnlineOperation(priorityTaskIndexedDBService, priorityTaskSupabaseService, 'add', null, data, userId) as Promise<PriorityTask>;
}
export async function updatePriorityTask(id: string, data: Partial<CreatePriorityTaskDTO>): Promise<PriorityTask> {
  const userId = getRequiredUserId();
  return handleOnlineOperation(priorityTaskIndexedDBService, priorityTaskSupabaseService, 'update', id, data, userId) as Promise<PriorityTask>;
}
export async function deletePriorityTask(id: string): Promise<void> {
  const userId = getRequiredUserId();
  await handleOnlineOperation(priorityTaskIndexedDBService, priorityTaskSupabaseService, 'delete', id, null, userId);
}
export async function getPriorityTaskById(id: string): Promise<PriorityTask | null> {
  const userId = getRequiredUserId();
  // Always fetch from local first for consistency, sync will reconcile
  return priorityTaskIndexedDBService.getById(id, userId);
}

// --- Routine Operations ---
export async function getAllRoutines(): Promise<Routine[]> {
  const userId = getRequiredUserId();
  return routineIndexedDBService.getAll(userId);
}
export async function getRoutineById(id: string): Promise<Routine | null> {
  const userId = getRequiredUserId();
  return routineIndexedDBService.getById(id, userId);
}
export async function addRoutine(data: CreateRoutineDTO): Promise<Routine> {
  const userId = getRequiredUserId();
  return handleOnlineOperation(routineIndexedDBService, routineSupabaseService, 'add', null, data, userId) as Promise<Routine>;
}
export async function updateRoutine(id: string, data: Partial<CreateRoutineDTO>): Promise<Routine> {
  const userId = getRequiredUserId();
  return handleOnlineOperation(routineIndexedDBService, routineSupabaseService, 'update', id, data, userId) as Promise<Routine>;
}
export async function deleteRoutine(id: string): Promise<void> {
  const userId = getRequiredUserId();
  await handleOnlineOperation(routineIndexedDBService, routineSupabaseService, 'delete', id, null, userId);
}
export async function getStepsForRoutine(routineId: string): Promise<RoutineStep[]> {
  const userId = getRequiredUserId();
  return routineIndexedDBService.getStepsForRoutine(routineId, userId);
}
export async function addStepToRoutine(routineId: string, stepData: CreateRoutineStepDTO): Promise<RoutineStep> {
  const userId = getRequiredUserId();
  // For child entities like steps, the handleOnlineOperation might need slight adjustment
  // if remote service for step creation needs separate call. Here, we assume a flat structure for simplicity.
  // Or, the remote RoutineService.addStepToRoutine should exist and be used.
  // Let's assume routineSupabaseService's interface is extended.
  if (_isOnline && userId) {
    try {
      const serverStep = await routineSupabaseService.addStepToRoutine(routineId, stepData, userId);
      const localStep = await routineIndexedDBService.addStepToRoutine(routineId, stepData, userId); // will be 'new'
      await routineIndexedDBService.updateRoutineStepSyncStatus(localStep.id, serverStep.updated_at, serverStep.id);
      return serverStep;
    } catch (error) {
      console.warn(`Online addStepToRoutine failed, falling back to local. Error:`, error);
      toast({ title: "Mode En Ligne - Opération échouée", description: `Sauvegarde locale de l'étape en attente de synchronisation. Erreur: ${(error as Error).message}`, variant: "default", duration: 7000 });
      return routineIndexedDBService.addStepToRoutine(routineId, stepData, userId);
    }
  } else {
    return routineIndexedDBService.addStepToRoutine(routineId, stepData, userId);
  }
}
export async function updateRoutineStep(stepId: string, stepData: Partial<CreateRoutineStepDTO>): Promise<RoutineStep> {
  const userId = getRequiredUserId();
   if (_isOnline && userId) {
    try {
      const serverStep = await routineSupabaseService.updateRoutineStep(stepId, stepData, userId);
      await routineIndexedDBService.updateRoutineStepSyncStatus(stepId, serverStep.updated_at);
      // Also perform local update to reflect changes immediately, then mark as synced.
      // The local update would have marked it 'updated', syncStatus overwrites it.
      const localUpdatedStep = await routineIndexedDBService.update(stepId, stepData as any, userId); // Cast needed if types differ
      await routineIndexedDBService.updateRoutineStepSyncStatus(localUpdatedStep.id, serverStep.updated_at);
      return serverStep;
    } catch (error) {
      console.warn(`Online updateRoutineStep failed, falling back to local. Error:`, error);
       toast({ title: "Mode En Ligne - Opération échouée", description: `Mise à jour locale de l'étape en attente de synchronisation. Erreur: ${(error as Error).message}`, variant: "default", duration: 7000 });
      return routineIndexedDBService.updateRoutineStep(stepId, stepData, userId);
    }
  } else {
    return routineIndexedDBService.updateRoutineStep(stepId, stepData, userId);
  }
}
export async function deleteRoutineStep(stepId: string): Promise<void> {
  const userId = getRequiredUserId();
  if (_isOnline && userId) {
    try {
      await routineSupabaseService.deleteRoutineStep(stepId, userId);
      await routineIndexedDBService.hardDeleteRoutineStep(stepId); // Hard delete locally after server success
    } catch (error) {
       console.warn(`Online deleteRoutineStep failed, falling back to local soft delete. Error:`, error);
       toast({ title: "Mode En Ligne - Opération échouée", description: `Suppression locale (soft) de l'étape en attente de synchronisation. Erreur: ${(error as Error).message}`, variant: "default", duration: 7000 });
      await routineIndexedDBService.deleteRoutineStep(stepId, userId); // Soft delete
    }
  } else {
    await routineIndexedDBService.deleteRoutineStep(stepId, userId); // Soft delete
  }
}


// --- BrainDump Operations ---
export async function getAllBrainDumps(): Promise<BrainDumpContent[]> {
  const userId = getRequiredUserId();
  return brainDumpIndexedDBService.getAll(userId);
}
export async function getBrainDumpById(id: string): Promise<BrainDumpContent | null> {
  const userId = getRequiredUserId();
  return brainDumpIndexedDBService.getById(id, userId);
}
export async function addBrainDump(data: CreateBrainDumpContentDTO): Promise<BrainDumpContent> {
  const userId = getRequiredUserId();
  return handleOnlineOperation(brainDumpIndexedDBService, brainDumpSupabaseService, 'add', null, data, userId) as Promise<BrainDumpContent>;
}
export async function updateBrainDump(id: string, data: Partial<CreateBrainDumpContentDTO>): Promise<BrainDumpContent> {
  const userId = getRequiredUserId();
  return handleOnlineOperation(brainDumpIndexedDBService, brainDumpSupabaseService, 'update', id, data, userId) as Promise<BrainDumpContent>;
}
export async function deleteBrainDump(id: string): Promise<void> {
  const userId = getRequiredUserId();
  await handleOnlineOperation(brainDumpIndexedDBService, brainDumpSupabaseService, 'delete', id, null, userId);
}

// --- TaskBreaker Operations ---
export async function getAllTaskBreakerTasks(): Promise<TaskBreakerTask[]> {
  const userId = getRequiredUserId();
  return taskBreakerIndexedDBService.getAll(userId);
}
export async function getTaskBreakerTaskById(id: string): Promise<TaskBreakerTask | null> {
  const userId = getRequiredUserId();
  return taskBreakerIndexedDBService.getById(id, userId);
}
export async function getTaskBreakerTasksByParent(parentId: string | null): Promise<TaskBreakerTask[]> {
  const userId = getRequiredUserId();
  return taskBreakerIndexedDBService.getTasksByParent(parentId, userId);
}
export async function addTaskBreakerTask(data: CreateTaskBreakerTaskDTO): Promise<TaskBreakerTask> {
  const userId = getRequiredUserId();
  return handleOnlineOperation(taskBreakerIndexedDBService, taskBreakerSupabaseService, 'add', null, data, userId) as Promise<TaskBreakerTask>;
}
export async function updateTaskBreakerTask(id: string, data: Partial<CreateTaskBreakerTaskDTO>): Promise<TaskBreakerTask> {
  const userId = getRequiredUserId();
  return handleOnlineOperation(taskBreakerIndexedDBService, taskBreakerSupabaseService, 'update', id, data, userId) as Promise<TaskBreakerTask>;
}
export async function deleteTaskBreakerTask(id: string): Promise<void> {
  const userId = getRequiredUserId();
  await handleOnlineOperation(taskBreakerIndexedDBService, taskBreakerSupabaseService, 'delete', id, null, userId);
}

// --- Synchronization Logic ---
async function startSyncSession(userId: string): Promise<boolean> {
  if (_isSynchronizing) {
    console.log("AppDataService: Sync already in progress for user", userId);
    return false;
  }
  _isSynchronizing = true;
  console.log("AppDataService: Starting sync session for user", userId);
  toast({ title: "Synchronisation en cours...", description: "Vos données sont en cours de synchronisation avec le serveur." });
  return true;
}

function endSyncSession(userId: string, errorOccurred: boolean = false) {
  _isSynchronizing = false;
  console.log("AppDataService: Sync session ended for user", userId);
   if (!errorOccurred) {
    toast({ title: "Synchronisation Terminée", description: "Vos données sont à jour." });
  } else {
    // Specific error toasts should be handled by the calling sync function
  }
}

async function synchronizePriorityTasks(userId: string) {
  console.log("Synchronizing PriorityTasks for user:", userId);
  const pendingTasks = await priorityTaskIndexedDBService.getPendingChanges(userId);

  for (const task of pendingTasks) {
    try {
      if (task.sync_status === 'new') {
        const serverTask = await priorityTaskSupabaseService.add(task, userId);
        await priorityTaskIndexedDBService.updateSyncStatus(task.id, serverTask.updated_at, serverTask.id);
      } else if (task.sync_status === 'updated') {
        const serverTask = await priorityTaskSupabaseService.update(task.id, task, userId);
        await priorityTaskIndexedDBService.updateSyncStatus(task.id, serverTask.updated_at);
      } else if (task.sync_status === 'deleted') {
        await priorityTaskSupabaseService.delete(task.id, userId);
        await priorityTaskIndexedDBService.hardDelete(task.id);
      }
    } catch (error) {
      console.error(`Failed to sync task ${task.id} with status ${task.sync_status}:`, error);
      toast({ title: `Erreur de synchronisation (Tâche ${task.text.substring(0,15)})`, description: (error as Error).message, variant: "destructive" });
      // Optionally, implement retry logic or mark as permanently failed
    }
  }

  // Download all tasks from server and reconcile
  const serverTasks = await priorityTaskSupabaseService.getAll(userId);
  await priorityTaskIndexedDBService.bulkUpdate(serverTasks); // This marks them as 'synced'

  // Optional: Delete local tasks that are 'synced' but no longer on server (orphans)
  const localSyncedTasks = await priorityTaskIndexedDBService.getAll(userId); // Gets non-deleted
  for (const localTask of localSyncedTasks) {
      if (localTask.sync_status === 'synced' && !serverTasks.find(st => st.id === localTask.id)) {
          await priorityTaskIndexedDBService.hardDelete(localTask.id);
          console.log(`Removed orphaned synced local task ${localTask.id}`);
      }
  }
  console.log("PriorityTasks synchronization complete for user:", userId);
}

async function synchronizeRoutines(userId: string) {
  console.log("Synchronizing Routines and Steps for user:", userId);
  const pendingRoutines = await routineIndexedDBService.getPendingRoutines(userId);
  const pendingSteps = await routineIndexedDBService.getPendingRoutineSteps(userId);

  // Sync Routines
  for (const routine of pendingRoutines) {
    try {
      if (routine.sync_status === 'new') {
        const serverRoutine = await routineSupabaseService.add(routine, userId);
        await routineIndexedDBService.updateRoutineSyncStatus(routine.id, serverRoutine.updated_at, serverRoutine.id);
        // If routine.id changed, steps' routine_id locally need update. Handled by updateRoutineSyncStatus.
      } else if (routine.sync_status === 'updated') {
        const serverRoutine = await routineSupabaseService.update(routine.id, routine, userId);
        await routineIndexedDBService.updateRoutineSyncStatus(routine.id, serverRoutine.updated_at);
      } else if (routine.sync_status === 'deleted') {
        await routineSupabaseService.delete(routine.id, userId); // Supabase service handles deleting steps
        await routineIndexedDBService.hardDeleteRoutine(routine.id);
      }
    } catch (error) {
      console.error(`Failed to sync routine ${routine.id} (${routine.name.substring(0,15)}) with status ${routine.sync_status}:`, error);
      toast({ title: `Erreur de synchronisation (Routine ${routine.name.substring(0,15)})`, description: (error as Error).message, variant: "destructive" });
    }
  }
  
  // Sync Steps (ensure routine_id consistency if parent routine was new and got a new ID from server)
  for (const step of pendingSteps) {
     // Check if parent routine was 'new' and its ID might have changed
     const parentRoutineLocal = await routineIndexedDBService.getById(step.routine_id, userId);
     if (!parentRoutineLocal || parentRoutineLocal.sync_status === 'deleted') {
         // Parent routine was deleted or doesn't exist, step should likely be removed or already handled
         if (step.sync_status !== 'deleted') await routineIndexedDBService.hardDeleteRoutineStep(step.id);
         continue;
     }
     // The local step.routine_id should be the one that's now synced on the server
     const stepToSync = { ...step, routine_id: parentRoutineLocal.id };


    try {
      if (stepToSync.sync_status === 'new') {
        const serverStep = await routineSupabaseService.addStepToRoutine(stepToSync.routine_id, stepToSync, userId);
        await routineIndexedDBService.updateRoutineStepSyncStatus(stepToSync.id, serverStep.updated_at, serverStep.id);
      } else if (stepToSync.sync_status === 'updated') {
        const serverStep = await routineSupabaseService.updateRoutineStep(stepToSync.id, stepToSync, userId);
        await routineIndexedDBService.updateRoutineStepSyncStatus(stepToSync.id, serverStep.updated_at);
      } else if (stepToSync.sync_status === 'deleted') {
        await routineSupabaseService.deleteRoutineStep(stepToSync.id, userId);
        await routineIndexedDBService.hardDeleteRoutineStep(stepToSync.id);
      }
    } catch (error) {
      console.error(`Failed to sync routine step ${stepToSync.id} with status ${stepToSync.sync_status}:`, error);
      toast({ title: `Erreur de synchronisation (Étape ${stepToSync.text.substring(0,15)})`, description: (error as Error).message, variant: "destructive" });
    }
  }

  // Download all routines and steps and reconcile
  const serverRoutines = await routineSupabaseService.getAll(userId);
  await routineIndexedDBService.bulkUpdateRoutines(serverRoutines);
  const serverSteps = (await Promise.all(serverRoutines.map(r => routineSupabaseService.getStepsForRoutine(r.id, userId)))).flat();
  await routineIndexedDBService.bulkUpdateRoutineSteps(serverSteps);
  
  // Optional: Orphan cleanup for routines and steps
  const localSyncedRoutines = await routineIndexedDBService.getAll(userId);
  for (const lr of localSyncedRoutines) {
    if (lr.sync_status === 'synced' && !serverRoutines.find(sr => sr.id === lr.id)) {
      await routineIndexedDBService.hardDeleteRoutine(lr.id);
    }
  }
  const allLocalSteps = (await Promise.all(localSyncedRoutines.map(r => routineIndexedDBService.getStepsForRoutine(r.id, userId)))).flat();
  for (const ls of allLocalSteps) {
    if (ls.sync_status === 'synced' && !serverSteps.find(ss => ss.id === ls.id)) {
      await routineIndexedDBService.hardDeleteRoutineStep(ls.id);
    }
  }
  console.log("Routines and Steps synchronization complete for user:", userId);
}

async function synchronizeBrainDumps(userId: string) {
  console.log("Synchronizing BrainDumps for user:", userId);
  const pendingDumps = await brainDumpIndexedDBService.getPendingChanges(userId);
  for (const dump of pendingDumps) {
    try {
      if (dump.sync_status === 'new') {
        const serverDump = await brainDumpSupabaseService.add(dump, userId);
        await brainDumpIndexedDBService.updateSyncStatus(dump.id, serverDump.updated_at, serverDump.id);
      } else if (dump.sync_status === 'updated') {
        const serverDump = await brainDumpSupabaseService.update(dump.id, dump, userId);
        await brainDumpIndexedDBService.updateSyncStatus(dump.id, serverDump.updated_at);
      } else if (dump.sync_status === 'deleted') {
        await brainDumpSupabaseService.delete(dump.id, userId);
        await brainDumpIndexedDBService.hardDelete(dump.id);
      }
    } catch (error) {
      console.error(`Failed to sync brain dump ${dump.id} with status ${dump.sync_status}:`, error);
      toast({ title: `Erreur de synchronisation (BrainDump)`, description: (error as Error).message, variant: "destructive" });
    }
  }
  const serverDumps = await brainDumpSupabaseService.getAll(userId);
  await brainDumpIndexedDBService.bulkUpdate(serverDumps);

  const localSyncedDumps = await brainDumpIndexedDBService.getAll(userId);
  for (const localDump of localSyncedDumps) {
      if (localDump.sync_status === 'synced' && !serverDumps.find(st => st.id === localDump.id)) {
          await brainDumpIndexedDBService.hardDelete(localDump.id);
      }
  }
  console.log("BrainDumps synchronization complete for user:", userId);
}

async function synchronizeTaskBreakerTasks(userId: string) {
  console.log("Synchronizing TaskBreakerTasks for user:", userId);
  const pendingTasks = await taskBreakerIndexedDBService.getPendingChanges(userId);
  // For hierarchical data, order of operations can matter (parents before children for 'new')
  // Sorting by depth and then operation type might be beneficial.
  pendingTasks.sort((a,b) => (a.depth ?? 0) - (b.depth ?? 0) || (a.sync_status === 'new' ? -1 : 1));


  for (const task of pendingTasks) {
     // If parent was 'new' and its ID changed on server, task.parent_id needs to be updated before upload.
     // This requires more complex tracking if server can assign new IDs. Assume client IDs are stable for now.
    if (task.parent_id) {
        const parentTaskLocal = await taskBreakerIndexedDBService.getById(task.parent_id, userId);
        if (!parentTaskLocal || parentTaskLocal.sync_status === 'deleted') {
            // Parent is gone or marked for deletion, this task should probably be deleted or re-parented.
            // For simplicity, if parent is deleted, we assume this child should also be (or was already) marked for deletion.
            if (task.sync_status !== 'deleted') await taskBreakerIndexedDBService.hardDelete(task.id);
            continue;
        }
         // Ensure task.parent_id uses the server-synced ID if it changed.
         // (Handled by updateSyncStatus if newServerId is passed for parent)
    }


    try {
      if (task.sync_status === 'new') {
        const serverTask = await taskBreakerSupabaseService.add(task, userId);
        await taskBreakerIndexedDBService.updateSyncStatus(task.id, serverTask.updated_at, serverTask.id);
      } else if (task.sync_status === 'updated') {
        const serverTask = await taskBreakerSupabaseService.update(task.id, task, userId);
        await taskBreakerIndexedDBService.updateSyncStatus(task.id, serverTask.updated_at);
      } else if (task.sync_status === 'deleted') {
        await taskBreakerSupabaseService.delete(task.id, userId); // Supabase RLS should handle child deletions if cascade is set up
        await taskBreakerIndexedDBService.hardDelete(task.id); // Local hard delete includes children
      }
    } catch (error) {
      console.error(`Failed to sync TaskBreaker task ${task.id} (${task.text.substring(0,15)}) with status ${task.sync_status}:`, error);
       toast({ title: `Erreur de synchronisation (Décomposition Tâche ${task.text.substring(0,15)})`, description: (error as Error).message, variant: "destructive" });
    }
  }
  const serverTasks = await taskBreakerSupabaseService.getAll(userId);
  await taskBreakerIndexedDBService.bulkUpdate(serverTasks);

  const localSyncedTasks = await taskBreakerIndexedDBService.getAll(userId);
  for (const localTask of localSyncedTasks) {
      if (localTask.sync_status === 'synced' && !serverTasks.find(st => st.id === localTask.id)) {
          await taskBreakerIndexedDBService.hardDelete(localTask.id);
      }
  }
  console.log("TaskBreakerTasks synchronization complete for user:", userId);
}


export async function synchronizeAllData(userId: string): Promise<void> {
  if (!userId) {
    console.warn("AppDataService: synchronizeAllData called without userId.");
    return;
  }
  if (!await startSyncSession(userId)) return; // Sync already in progress or conditions not met

  let errorOccurred = false;
  try {
    await synchronizePriorityTasks(userId);
    await synchronizeRoutines(userId);
    await synchronizeBrainDumps(userId);
    await synchronizeTaskBreakerTasks(userId);
    // TODO: Add calls to synchronize other data types here
    console.log("AppDataService: All data synchronization attempts finished for user", userId);
  } catch (error) {
    errorOccurred = true;
    console.error("AppDataService: Critical error during synchronizeAllData for user", userId, error);
    toast({ title: "Erreur Critique de Synchronisation", description: (error as Error).message, variant: "destructive" });
  } finally {
    endSyncSession(userId, errorOccurred);
  }
}


/**
 * Initializes the AppDataService with the current user's ID and online status.
 * This should be called after user authentication state is known and online status determined.
 * @param userId The ID of the currently authenticated user, or null if logged out.
 * @param isOnline The current online status of the application.
 */
export function initializeAppDataService(userId: string | null, isOnline?: boolean) {
    const oldUserId = getCurrentUserId();
    setCurrentUserId(userId);

    if (typeof isOnline === 'boolean' && isOnline !== getOnlineStatus()) {
        setOnlineStatus(isOnline); // This will trigger sync if moving to online with a user
    } else if (userId && userId !== oldUserId && getOnlineStatus()) {
        // New user logged in or user changed while online, trigger sync
        synchronizeAllData(userId).catch(error => {
             console.error("Error during sync on user change:", error);
             toast({ title: "Erreur de Synchronisation Initiale", description: "Certaines données n'ont pu être synchronisées.", variant: "destructive"});
        });
    } else if (userId && getOnlineStatus() && !isOnline) { 
        // This case implies isOnline argument was not provided, but app has become online.
        // It's covered by setOnlineStatus if isOnline argument reflects the change.
        // For safety, ensure sync if user exists and app is online.
         synchronizeAllData(userId).catch(error => {
             console.error("Error during initial sync check:", error);
             toast({ title: "Erreur de Vérification de Synchronisation", description: "Problème lors de la vérification des données.", variant: "destructive"});
        });
    }
    
    console.log(`AppDataService initialized/updated. UserID: ${getCurrentUserId()}, Online: ${getOnlineStatus()}`);
}
