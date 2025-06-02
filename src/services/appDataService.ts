
// src/services/appDataService.ts
"use client"; // This service will orchestrate client-side DB interactions

import { PriorityTaskIndexedDBService } from './indexeddb/priority-task.indexeddb.service';
import { PriorityTaskSupabaseService } from './supabase/priority-task.supabase.service';
import type { IPriorityTaskService } from './interfaces/IPriorityTaskService';
import type { PriorityTask, CreatePriorityTaskDTO } from '@/types';

// --- Configuration ---
// This state would eventually be managed by a global context/store and network status.
let _isOnline = true; // Default to online
let _currentUserId: string | null = null; // Should be set from AuthContext

export function setOnlineStatus(isOnline: boolean) {
  _isOnline = isOnline;
  // Potentially trigger sync operations here in the future
}

export function getOnlineStatus(): boolean {
  return _isOnline;
}

export function setCurrentUserId(userId: string | null) {
    _currentUserId = userId;
}

// --- Service Instances ---
// These instances could be memoized or created on demand.
const priorityTaskIndexedDBService = new PriorityTaskIndexedDBService();
const priorityTaskSupabaseService = new PriorityTaskSupabaseService();

// --- PriorityTask Operations ---
function getPriorityTaskService(): IPriorityTaskService {
  if (_isOnline && _currentUserId) {
    return priorityTaskSupabaseService;
  }
  return priorityTaskIndexedDBService;
}

export async function getAllPriorityTasks(): Promise<PriorityTask[]> {
  const userIdToUse = _currentUserId; // Use the module-level userId
  if (!userIdToUse && _isOnline) { // If online but no user, can't fetch from Supabase (unless public data)
    console.warn("getAllPriorityTasks: Online but no user ID, returning empty. Or handle public data case.");
    return []; // Or fetch from local if that's the desired fallback
  }
  if (!userIdToUse && !_isOnline){
    console.warn("getAllPriorityTasks: Offline and no user ID, local data might be mixed if app was used by multiple users without logout & clear.");
    // In a true multi-user offline app, IndexedDB would also need user_id scoping more strictly.
    // For now, we assume local data is for "the current implicit user".
    // This part needs careful design for multi-user offline.
    // If _currentUserId is essential for local store too, then this path might be problematic.
    // For now, assuming Dexie getAll won't use userId if not passed or if local service ignores it.
    // The current IndexedDB service implementation *requires* userId. So this path needs userId.
     return []; // Or throw error: "User ID required for fetching tasks."
  }
  return getPriorityTaskService().getAll(userIdToUse!); // Non-null assertion if we ensure userId is present
}

export async function addPriorityTask(data: CreatePriorityTaskDTO): Promise<PriorityTask> {
  const userIdToUse = _currentUserId;
  if (!userIdToUse) {
    throw new Error("User ID is required to add a task.");
  }
  // If online, try Supabase. If fails, could queue for IndexedDB (future enhancement).
  // For now, simple delegation:
  return getPriorityTaskService().add(data, userIdToUse);
}

export async function updatePriorityTask(id: string, data: Partial<CreatePriorityTaskDTO>): Promise<PriorityTask> {
  const userIdToUse = _currentUserId;
  if (!userIdToUse) {
    throw new Error("User ID is required to update a task.");
  }
  return getPriorityTaskService().update(id, data, userIdToUse);
}

export async function deletePriorityTask(id: string): Promise<void> {
  const userIdToUse = _currentUserId;
  if (!userIdToUse) {
    throw new Error("User ID is required to delete a task.");
  }
  return getPriorityTaskService().delete(id, userIdToUse);
}

export async function getPriorityTaskById(id: string): Promise<PriorityTask | null> {
    const userIdToUse = _currentUserId;
    if (!userIdToUse) {
        // Decide behavior: throw error or return null if no user context for fetching.
        // console.warn("getPriorityTaskById: No user ID available.");
        return null; 
    }
    return getPriorityTaskService().getById(id, userIdToUse);
}


// TODO: Implement similar service instance management and exported functions
// for RoutineService, BrainDumpService, TaskBreakerService.

// Example:
// const routineIndexedDBService = new RoutineIndexedDBService(); // Assuming this class exists
// const routineSupabaseService = new RoutineSupabaseService(); // Assuming this class exists

// function getRoutineService(): IRoutineService { ... }
// export async function getAllRoutines(...) { ... }
// etc.

/**
 * Initializes the AppDataService with the current user's ID.
 * This should be called after user authentication state is known.
 * @param userId The ID of the currently authenticated user, or null if logged out.
 */
export function initializeAppDataService(userId: string | null) {
    setCurrentUserId(userId);
    // You could also attempt an initial sync or data load here if needed.