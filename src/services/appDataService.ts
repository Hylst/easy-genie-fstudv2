
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
  const oldIsOnline = _isOnline;
  _isOnline = isOnline;
  console.log(`AppDataService: Online status set to ${_isOnline}`);
  if (_isOnline && !oldIsOnline && _currentUserId) { // Transitioned to Online
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

// --- Generic Handler for Online Operations ---
async function handleOnlineOperation<T extends {id: string, updated_at: string}, DTO>(
  localService: { add: (data: DTO, userId: string) => Promise<T & {id: string}>; update: (id: string, data: Partial<DTO>, userId: string) => Promise<T>; delete: (id: string, userId: string) => Promise<void>; updateSyncStatus: (id: string, serverTimestamp: string, newServerId?: string) => Promise<void>; hardDelete?: (id: string) => Promise<void>; },
  remoteService: { add: (data: DTO, userId: string) => Promise<T>; update: (id: string, data: Partial<DTO>, userId: string) => Promise<T>; delete: (id: string, userId: string) => Promise<void>; },
  operation: 'add' | 'update' | 'delete',
  id: string | null, 
  data: DTO | Partial<DTO> | null, 
  userId: string
): Promise<T | void> {
  if (_isOnline && userId) {
    try {
      let serverEntity: T | null = null;

      if (operation === 'add') {
        serverEntity = await remoteService.add(data as DTO, userId);
        const localNewItem = await localService.add(data as DTO, userId); 
        await localService.updateSyncStatus(localNewItem.id, serverEntity.updated_at, serverEntity.id); 
        return serverEntity;
      } else if (operation === 'update' && id && data) {
        serverEntity = await remoteService.update(id, data as Partial<DTO>, userId);
        // Local update needs to happen BEFORE sync status update to preserve potential unsynced changes if server update succeeded but local failed
        const localUpdatedItem = await localService.update(id, data as Partial<DTO>, userId); // ensure this doesn't mark as 'updated' if server succeeded
        await localService.updateSyncStatus(localUpdatedItem.id, serverEntity.updated_at);
        return serverEntity;
      } else if (operation === 'delete' && id) {
        await remoteService.delete(id, userId);
        if (localService.hardDelete) {
          await localService.hardDelete(id);
        } else {
          // Fallback if hardDelete is not explicitly defined on this local service
          await localService.delete(id, userId); 
        }
        return; 
      } else {
        throw new Error("Invalid operation parameters for handleOnlineOperation");
      }
    } catch (error) {
      console.warn(`Online operation '${operation}' failed, falling back to local. Full Error Object:`, error);
      let errorMessage = "An unknown error occurred during online operation.";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({ title: "Mode En Ligne - Opération échouée", description: `Sauvegarde locale en attente de synchronisation. Erreur: ${errorMessage}`, variant: "default", duration: 7000 });
      
      if (operation === 'add') return localService.add(data as DTO, userId);
      if (operation === 'update' && id && data) return localService.update(id, data as Partial<DTO>, userId); // This will set sync_status to 'updated' or 'new'
      if (operation === 'delete' && id) return localService.delete(id, userId); // This will soft delete by setting sync_status to 'deleted'
      throw error; 
    }
  } else {
    // Offline or no user: perform local operation, sync_status will be set by local service
    if (!userId && operation !== 'add' && operation !== 'update' && operation !== 'delete') {
        // For operations that don't strictly require userId for local only mode (should be rare)
    } else if (!userId) {
        throw new Error("User not logged in. Operation cannot proceed.");
    }
    if (operation === 'add') return localService.add(data as DTO, userId);
    if (operation === 'update' && id && data) return localService.update(id, data as Partial<DTO>, userId);
    if (operation === 'delete' && id) return localService.delete(id, userId);
    throw new Error("Operation parameters invalid for offline mode or user not logged in.");
  }
}


// --- PriorityTask Operations ---
export async function getAllPriorityTasks(): Promise<PriorityTask[]> {
  const userId = getRequiredUserId();
  return priorityTaskIndexedDBService.getAll(userId);
}
export async function addPriorityTask(data: CreatePriorityTaskDTO): Promise<PriorityTask> {
  const userId = getRequiredUserId();
  return handleOnlineOperation<PriorityTask, CreatePriorityTaskDTO>(priorityTaskIndexedDBService, priorityTaskSupabaseService, 'add', null, data, userId) as Promise<PriorityTask>;
}
export async function updatePriorityTask(id: string, data: Partial<CreatePriorityTaskDTO>): Promise<PriorityTask> {
  const userId = getRequiredUserId();
  return handleOnlineOperation<PriorityTask, CreatePriorityTaskDTO>(priorityTaskIndexedDBService, priorityTaskSupabaseService, 'update', id, data, userId) as Promise<PriorityTask>;
}
export async function deletePriorityTask(id: string): Promise<void> {
  const userId = getRequiredUserId();
  await handleOnlineOperation<PriorityTask, CreatePriorityTaskDTO>(priorityTaskIndexedDBService, priorityTaskSupabaseService, 'delete', id, null, userId);
}
export async function getPriorityTaskById(id: string): Promise<PriorityTask | null> {
  const userId = getRequiredUserId();
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
  return handleOnlineOperation<Routine, CreateRoutineDTO>(routineIndexedDBService, routineSupabaseService, 'add', null, data, userId) as Promise<Routine>;
}
export async function updateRoutine(id: string, data: Partial<CreateRoutineDTO>): Promise<Routine> {
  const userId = getRequiredUserId();
  return handleOnlineOperation<Routine, CreateRoutineDTO>(routineIndexedDBService, routineSupabaseService, 'update', id, data, userId) as Promise<Routine>;
}
export async function deleteRoutine(id: string): Promise<void> {
  const userId = getRequiredUserId();
  await handleOnlineOperation<Routine, CreateRoutineDTO>(routineIndexedDBService, routineSupabaseService, 'delete', id, null, userId);
}
export async function getStepsForRoutine(routineId: string): Promise<RoutineStep[]> {
  const userId = getRequiredUserId();
  return routineIndexedDBService.getStepsForRoutine(routineId, userId);
}

// Handle RoutineStep operations with specific logic (can't use generic handleOnlineOperation directly due to different service method signatures)
export async function addStepToRoutine(routineId: string, stepData: CreateRoutineStepDTO): Promise<RoutineStep> {
  const userId = getRequiredUserId();
  if (_isOnline && userId) {
    try {
      const serverStep = await routineSupabaseService.addStepToRoutine(routineId, stepData, userId);
      const localStep = await routineIndexedDBService.addStepToRoutine(routineId, stepData, userId); 
      await routineIndexedDBService.updateRoutineStepSyncStatus(localStep.id, serverStep.updated_at, serverStep.id);
      return serverStep;
    } catch (error) {
      console.warn(`Online addStepToRoutine failed, falling back to local. Error:`, error);
      let errorMessage = (error instanceof Error) ? error.message : String(error);
      toast({ title: "Mode En Ligne - Opération échouée", description: `Sauvegarde locale de l'étape en attente de synchronisation. Erreur: ${errorMessage}`, variant: "default", duration: 7000 });
      return routineIndexedDBService.addStepToRoutine(routineId, stepData, userId);
    }
  } else {
    if (!userId) throw new Error("User not logged in. Operation cannot proceed.");
    return routineIndexedDBService.addStepToRoutine(routineId, stepData, userId);
  }
}

export async function updateRoutineStep(stepId: string, stepData: Partial<CreateRoutineStepDTO>): Promise<RoutineStep> {
  const userId = getRequiredUserId();
   if (_isOnline && userId) {
    try {
      const serverStep = await routineSupabaseService.updateRoutineStep(stepId, stepData, userId);
      const localUpdatedStep = await routineIndexedDBService.updateRoutineStep(stepId, stepData, userId); // update local first
      await routineIndexedDBService.updateRoutineStepSyncStatus(localUpdatedStep.id, serverStep.updated_at); // then mark as synced
      return serverStep;
    } catch (error) {
      console.warn(`Online updateRoutineStep failed, falling back to local. Error:`, error);
      let errorMessage = (error instanceof Error) ? error.message : String(error);
      toast({ title: "Mode En Ligne - Opération échouée", description: `Mise à jour locale de l'étape en attente de synchronisation. Erreur: ${errorMessage}`, variant: "default", duration: 7000 });
      return routineIndexedDBService.updateRoutineStep(stepId, stepData, userId);
    }
  } else {
    if (!userId) throw new Error("User not logged in. Operation cannot proceed.");
    return routineIndexedDBService.updateRoutineStep(stepId, stepData, userId);
  }
}
export async function deleteRoutineStep(stepId: string): Promise<void> {
  const userId = getRequiredUserId();
  if (_isOnline && userId) {
    try {
      await routineSupabaseService.deleteRoutineStep(stepId, userId);
      await routineIndexedDBService.hardDeleteRoutineStep(stepId);
    } catch (error) {
       console.warn(`Online deleteRoutineStep failed, falling back to local soft delete. Error:`, error);
       let errorMessage = (error instanceof Error) ? error.message : String(error);
       toast({ title: "Mode En Ligne - Opération échouée", description: `Suppression locale (soft) de l'étape en attente de synchronisation. Erreur: ${errorMessage}`, variant: "default", duration: 7000 });
      await routineIndexedDBService.deleteRoutineStep(stepId, userId);
    }
  } else {
    if (!userId) throw new Error("User not logged in. Operation cannot proceed.");
    await routineIndexedDBService.deleteRoutineStep(stepId, userId); 
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
  return handleOnlineOperation<BrainDumpContent, CreateBrainDumpContentDTO>(brainDumpIndexedDBService, brainDumpSupabaseService, 'add', null, data, userId) as Promise<BrainDumpContent>;
}
export async function updateBrainDump(id: string, data: Partial<CreateBrainDumpContentDTO>): Promise<BrainDumpContent> {
  const userId = getRequiredUserId();
  return handleOnlineOperation<BrainDumpContent, CreateBrainDumpContentDTO>(brainDumpIndexedDBService, brainDumpSupabaseService, 'update', id, data, userId) as Promise<BrainDumpContent>;
}
export async function deleteBrainDump(id: string): Promise<void> {
  const userId = getRequiredUserId();
  await handleOnlineOperation<BrainDumpContent, CreateBrainDumpContentDTO>(brainDumpIndexedDBService, brainDumpSupabaseService, 'delete', id, null, userId);
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
  return handleOnlineOperation<TaskBreakerTask, CreateTaskBreakerTaskDTO>(taskBreakerIndexedDBService, taskBreakerSupabaseService, 'add', null, data, userId) as Promise<TaskBreakerTask>;
}
export async function updateTaskBreakerTask(id: string, data: Partial<CreateTaskBreakerTaskDTO>): Promise<TaskBreakerTask> {
  const userId = getRequiredUserId();
  return handleOnlineOperation<TaskBreakerTask, CreateTaskBreakerTaskDTO>(taskBreakerIndexedDBService, taskBreakerSupabaseService, 'update', id, data, userId) as Promise<TaskBreakerTask>;
}
export async function deleteTaskBreakerTask(id: string): Promise<void> {
  const userId = getRequiredUserId();
  await handleOnlineOperation<TaskBreakerTask, CreateTaskBreakerTaskDTO>(taskBreakerIndexedDBService, taskBreakerSupabaseService, 'delete', id, null, userId);
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
      toast({ title: `Erreur de synchronisation (Tâche Pri.)`, description: `La tâche "${task.text.substring(0,20)}..." n'a pu être synchronisée. Erreur: ${(error as Error).message}`, variant: "destructive", duration: 7000 });
    }
  }

  const serverTasks = await priorityTaskSupabaseService.getAll(userId);
  await priorityTaskIndexedDBService.bulkUpdate(serverTasks); 

  const localSyncedTasks = await priorityTaskIndexedDBService.getAll(userId); 
  for (const localTask of localSyncedTasks) {
      if (localTask.sync_status === 'synced' && !serverTasks.find(st => st.id === localTask.id)) {
          await priorityTaskIndexedDBService.hardDelete(localTask.id);
          console.log(`Removed orphaned synced local priority task ${localTask.id}`);
      }
  }
  console.log("PriorityTasks synchronization complete for user:", userId);
}

async function synchronizeRoutines(userId: string) {
  console.log("Synchronizing Routines and Steps for user:", userId);
  const pendingRoutines = await routineIndexedDBService.getPendingRoutines(userId);
  const pendingSteps = await routineIndexedDBService.getPendingRoutineSteps(userId);

  for (const routine of pendingRoutines) {
    try {
      if (routine.sync_status === 'new') {
        const serverRoutine = await routineSupabaseService.add(routine, userId);
        await routineIndexedDBService.updateRoutineSyncStatus(routine.id, serverRoutine.updated_at, serverRoutine.id);
      } else if (routine.sync_status === 'updated') {
        const serverRoutine = await routineSupabaseService.update(routine.id, routine, userId);
        await routineIndexedDBService.updateRoutineSyncStatus(routine.id, serverRoutine.updated_at);
      } else if (routine.sync_status === 'deleted') {
        await routineSupabaseService.delete(routine.id, userId); 
        await routineIndexedDBService.hardDeleteRoutine(routine.id);
      }
    } catch (error) {
      console.error(`Failed to sync routine ${routine.id} (${routine.name.substring(0,15)}) with status ${routine.sync_status}:`, error);
      toast({ title: `Erreur de synchronisation (Routine ${routine.name.substring(0,15)})`, description: (error as Error).message, variant: "destructive", duration: 7000 });
    }
  }
  
  for (const step of pendingSteps) {
     const parentRoutineLocal = await routineIndexedDBService.getById(step.routine_id, userId);
     if (!parentRoutineLocal || parentRoutineLocal.sync_status === 'deleted') {
         if (step.sync_status !== 'deleted') await routineIndexedDBService.hardDeleteRoutineStep(step.id);
         continue;
     }
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
      toast({ title: `Erreur de synchronisation (Étape ${stepToSync.text.substring(0,15)})`, description: (error as Error).message, variant: "destructive", duration: 7000 });
    }
  }

  const serverRoutines = await routineSupabaseService.getAll(userId);
  await routineIndexedDBService.bulkUpdateRoutines(serverRoutines);
  const serverSteps = (await Promise.all(serverRoutines.map(r => routineSupabaseService.getStepsForRoutine(r.id, userId)))).flat();
  await routineIndexedDBService.bulkUpdateRoutineSteps(serverSteps);
  
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
      toast({ title: `Erreur de synchronisation (BrainDump)`, description: (error as Error).message, variant: "destructive", duration: 7000 });
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
  pendingTasks.sort((a,b) => (a.depth ?? 0) - (b.depth ?? 0) || (a.sync_status === 'new' ? -1 : 1));

  for (const task of pendingTasks) {
    if (task.parent_id) {
        const parentTaskLocal = await taskBreakerIndexedDBService.getById(task.parent_id, userId);
        if (!parentTaskLocal || parentTaskLocal.sync_status === 'deleted') {
            if (task.sync_status !== 'deleted') await taskBreakerIndexedDBService.hardDelete(task.id);
            continue;
        }
    }

    try {
      if (task.sync_status === 'new') {
        const serverTask = await taskBreakerSupabaseService.add(task, userId);
        await taskBreakerIndexedDBService.updateSyncStatus(task.id, serverTask.updated_at, serverTask.id);
      } else if (task.sync_status === 'updated') {
        const serverTask = await taskBreakerSupabaseService.update(task.id, task, userId);
        await taskBreakerIndexedDBService.updateSyncStatus(task.id, serverTask.updated_at);
      } else if (task.sync_status === 'deleted') {
        await taskBreakerSupabaseService.delete(task.id, userId); 
        await taskBreakerIndexedDBService.hardDelete(task.id); 
      }
    } catch (error) {
      console.error(`Failed to sync TaskBreaker task ${task.id} (${task.text.substring(0,15)}) with status ${task.sync_status}:`, error);
       toast({ title: `Erreur de synchronisation (Décomposition Tâche ${task.text.substring(0,15)})`, description: (error as Error).message, variant: "destructive", duration: 7000 });
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
  if (!await startSyncSession(userId)) return; 

  let errorOccurred = false;
  try {
    await synchronizePriorityTasks(userId);
    await synchronizeRoutines(userId);
    await synchronizeBrainDumps(userId);
    await synchronizeTaskBreakerTasks(userId);
    console.log("AppDataService: All data synchronization attempts finished for user", userId);
  } catch (error) {
    errorOccurred = true;
    console.error("AppDataService: Critical error during synchronizeAllData for user", userId, error);
    toast({ title: "Erreur Critique de Synchronisation", description: (error as Error).message, variant: "destructive" });
  } finally {
    endSyncSession(userId, errorOccurred);
  }
}


export function initializeAppDataService(userId: string | null, isOnline?: boolean) {
    const oldUserId = getCurrentUserId();
    const oldIsOnline = getOnlineStatus();
    
    setCurrentUserId(userId);

    if (typeof isOnline === 'boolean' && isOnline !== oldIsOnline) {
        setOnlineStatus(isOnline); // This will trigger sync if moving to online with a user
    } else if (userId && userId !== oldUserId && getOnlineStatus()) {
        synchronizeAllData(userId).catch(error => {
             console.error("Error during sync on user change:", error);
             toast({ title: "Erreur de Synchronisation Initiale", description: "Certaines données n'ont pu être synchronisées.", variant: "destructive"});
        });
    } else if (userId && getOnlineStatus() && oldUserId === userId && typeof isOnline === 'boolean' && isOnline && !oldIsOnline) {
        // This condition is specifically for the case where user is the same, but app just came online
        // The setOnlineStatus call above would handle this if isOnline argument correctly reflects the new online state.
        // This is a bit redundant but acts as a safeguard.
        synchronizeAllData(userId).catch(error => {
             console.error("Error during sync on becoming online:", error);
             toast({ title: "Erreur de Synchronisation (Mode En Ligne)", description: "Problème lors de la synchronisation des données.", variant: "destructive"});
        });
    }
    
    console.log(`AppDataService initialized/updated. UserID: ${getCurrentUserId()}, Online: ${getOnlineStatus()}`);
}
