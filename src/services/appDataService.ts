
// src/services/appDataService.ts
"use client"; 

import { PriorityTaskIndexedDBService } from './indexeddb/priority-task.indexeddb.service';
import { PriorityTaskSupabaseService } from './supabase/priority-task.supabase.service';
import type { IPriorityTaskService } from './interfaces/IPriorityTaskService';
import type { PriorityTask, CreatePriorityTaskDTO } from '@/types';

// --- Configuration ---
let _isOnline = true; 
let _currentUserId: string | null = null;

export function setOnlineStatus(isOnline: boolean) {
  _isOnline = isOnline;
  console.log(`AppDataService: Online status set to ${_isOnline}`);
  // TODO: Potentially trigger sync operations here in the future
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

// --- PriorityTask Operations ---
function getPriorityTaskService(): IPriorityTaskService {
  if (_isOnline && _currentUserId) {
    console.log("AppDataService: Using Supabase for PriorityTask operations.");
    return priorityTaskSupabaseService;
  }
  console.log("AppDataService: Using IndexedDB for PriorityTask operations.");
  return priorityTaskIndexedDBService;
}

export async function getAllPriorityTasks(): Promise<PriorityTask[]> {
  const userIdToUse = getCurrentUserId();
  if (!userIdToUse) {
    // If offline, or online but no user, we can't fetch user-specific data.
    // For IndexedDB, if it's designed to be multi-user, it still needs a user key.
    // If it's single-user offline context, one might fetch all, but our service requires userId.
    console.warn("getAllPriorityTasks: No user ID available. Returning empty array.");
    return []; 
  }
  try {
    return await getPriorityTaskService().getAll(userIdToUse);
  } catch (error) {
    console.error("Error in getAllPriorityTasks (AppDataService):", error);
    // Fallback or rethrow: if online failed, could try local if desired (complex sync needed)
    // For now, just rethrow or return empty to signal failure to UI
    // if (_isOnline && _currentUserId) { /* Potentially try local as fallback */ }
    return []; // Or throw error;
  }
}

export async function addPriorityTask(data: CreatePriorityTaskDTO): Promise<PriorityTask> {
  const userIdToUse = getCurrentUserId();
  if (!userIdToUse) {
    throw new Error("User ID is required to add a task.");
  }
  try {
    return await getPriorityTaskService().add(data, userIdToUse);
  } catch (error) {
     console.error("Error in addPriorityTask (AppDataService):", error);
     // Handle error appropriately, maybe save to a "failed_sync" queue if online failed
     throw error; // Rethrow for UI to handle
  }
}

export async function updatePriorityTask(id: string, data: Partial<CreatePriorityTaskDTO>): Promise<PriorityTask> {
  const userIdToUse = getCurrentUserId();
  if (!userIdToUse) {
    throw new Error("User ID is required to update a task.");
  }
  try {
    return await getPriorityTaskService().update(id, data, userIdToUse);
  } catch (error) {
    console.error("Error in updatePriorityTask (AppDataService):", error);
    throw error;
  }
}

export async function deletePriorityTask(id: string): Promise<void> {
  const userIdToUse = getCurrentUserId();
  if (!userIdToUse) {
    throw new Error("User ID is required to delete a task.");
  }
  try {
    return await getPriorityTaskService().delete(id, userIdToUse);
  } catch (error) {
    console.error("Error in deletePriorityTask (AppDataService):", error);
    throw error;
  }
}

export async function getPriorityTaskById(id: string): Promise<PriorityTask | null> {
    const userIdToUse = getCurrentUserId();
    if (!userIdToUse) {
        console.warn("getPriorityTaskById: No user ID available. Returning null.");
        return null; 
    }
    try {
        return await getPriorityTaskService().getById(id, userIdToUse);
    } catch (error) {
        console.error("Error in getPriorityTaskById (AppDataService):", error);
        return null; // Or rethrow
    }
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
 * Initializes the AppDataService with the current user's ID and online status.
 * This should be called after user authentication state is known and online status determined.
 * @param userId The ID of the currently authenticated user, or null if logged out.
 * @param isOnline The current online status of the application.
 */
export function initializeAppDataService(userId: string | null, isOnline?: boolean) {
    setCurrentUserId(userId);
    if (typeof isOnline === 'boolean') {
        setOnlineStatus(isOnline);
    }
    console.log(`AppDataService initialized. UserID: ${userId}, Online: ${getOnlineStatus()}`);
    // You could also attempt an initial sync or data load here if needed.
}
