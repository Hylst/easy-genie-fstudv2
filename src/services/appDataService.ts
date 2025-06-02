
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
function getPriorityTaskService(): IPriorityTaskService {
  if (_isOnline && _currentUserId) {
    console.log("AppDataService: Using Supabase for PriorityTask.");
    return priorityTaskSupabaseService;
  }
  console.log("AppDataService: Using IndexedDB for PriorityTask.");
  return priorityTaskIndexedDBService;
}

export async function getAllPriorityTasks(): Promise<PriorityTask[]> {
  const userId = getRequiredUserId();
  return getPriorityTaskService().getAll(userId);
}
export async function addPriorityTask(data: CreatePriorityTaskDTO): Promise<PriorityTask> {
  const userId = getRequiredUserId();
  return getPriorityTaskService().add(data, userId);
}
export async function updatePriorityTask(id: string, data: Partial<CreatePriorityTaskDTO>): Promise<PriorityTask> {
  const userId = getRequiredUserId();
  return getPriorityTaskService().update(id, data, userId);
}
export async function deletePriorityTask(id: string): Promise<void> {
  const userId = getRequiredUserId();
  return getPriorityTaskService().delete(id, userId);
}
export async function getPriorityTaskById(id: string): Promise<PriorityTask | null> {
  const userId = getRequiredUserId();
  return getPriorityTaskService().getById(id, userId);
}

// --- Routine Operations ---
function getRoutineService(): IRoutineService {
  if (_isOnline && _currentUserId) {
    console.log("AppDataService: Using Supabase for Routine.");
    return routineSupabaseService;
  }
  console.log("AppDataService: Using IndexedDB for Routine.");
  return routineIndexedDBService;
}
export async function getAllRoutines(): Promise<Routine[]> {
  const userId = getRequiredUserId();
  return getRoutineService().getAll(userId);
}
export async function getRoutineById(id: string): Promise<Routine | null> {
  const userId = getRequiredUserId();
  return getRoutineService().getById(id, userId);
}
export async function addRoutine(data: CreateRoutineDTO): Promise<Routine> {
  const userId = getRequiredUserId();
  return getRoutineService().add(data, userId);
}
export async function updateRoutine(id: string, data: Partial<CreateRoutineDTO>): Promise<Routine> {
  const userId = getRequiredUserId();
  return getRoutineService().update(id, data, userId);
}
export async function deleteRoutine(id: string): Promise<void> {
  const userId = getRequiredUserId();
  return getRoutineService().delete(id, userId);
}
export async function getStepsForRoutine(routineId: string): Promise<RoutineStep[]> {
  const userId = getRequiredUserId();
  return getRoutineService().getStepsForRoutine(routineId, userId);
}
export async function addStepToRoutine(routineId: string, stepData: CreateRoutineStepDTO): Promise<RoutineStep> {
  const userId = getRequiredUserId();
  return getRoutineService().addStepToRoutine(routineId, stepData, userId);
}
export async function updateRoutineStep(stepId: string, stepData: Partial<CreateRoutineStepDTO>): Promise<RoutineStep> {
  const userId = getRequiredUserId();
  return getRoutineService().updateRoutineStep(stepId, stepData, userId);
}
export async function deleteRoutineStep(stepId: string): Promise<void> {
  const userId = getRequiredUserId();
  return getRoutineService().deleteRoutineStep(stepId, userId);
}

// --- BrainDump Operations ---
function getBrainDumpService(): IBrainDumpService {
  if (_isOnline && _currentUserId) {
    console.log("AppDataService: Using Supabase for BrainDump.");
    return brainDumpSupabaseService;
  }
  console.log("AppDataService: Using IndexedDB for BrainDump.");
  return brainDumpIndexedDBService;
}
export async function getAllBrainDumps(): Promise<BrainDumpContent[]> {
  const userId = getRequiredUserId();
  return getBrainDumpService().getAll(userId);
}
export async function getBrainDumpById(id: string): Promise<BrainDumpContent | null> {
  const userId = getRequiredUserId();
  return getBrainDumpService().getById(id, userId);
}
export async function addBrainDump(data: CreateBrainDumpContentDTO): Promise<BrainDumpContent> {
  const userId = getRequiredUserId();
  return getBrainDumpService().add(data, userId);
}
export async function updateBrainDump(id: string, data: Partial<CreateBrainDumpContentDTO>): Promise<BrainDumpContent> {
  const userId = getRequiredUserId();
  return getBrainDumpService().update(id, data, userId);
}
export async function deleteBrainDump(id: string): Promise<void> {
  const userId = getRequiredUserId();
  return getBrainDumpService().delete(id, userId);
}

// --- TaskBreaker Operations ---
function getTaskBreakerService(): ITaskBreakerService {
  if (_isOnline && _currentUserId) {
    console.log("AppDataService: Using Supabase for TaskBreaker.");
    return taskBreakerSupabaseService;
  }
  console.log("AppDataService: Using IndexedDB for TaskBreaker.");
  return taskBreakerIndexedDBService;
}
export async function getAllTaskBreakerTasks(): Promise<TaskBreakerTask[]> {
  const userId = getRequiredUserId();
  return getTaskBreakerService().getAll(userId);
}
export async function getTaskBreakerTaskById(id: string): Promise<TaskBreakerTask | null> {
  const userId = getRequiredUserId();
  return getTaskBreakerService().getById(id, userId);
}
export async function getTaskBreakerTasksByParent(parentId: string | null): Promise<TaskBreakerTask[]> {
  const userId = getRequiredUserId();
  return getTaskBreakerService().getTasksByParent(parentId, userId);
}
export async function addTaskBreakerTask(data: CreateTaskBreakerTaskDTO): Promise<TaskBreakerTask> {
  const userId = getRequiredUserId();
  return getTaskBreakerService().add(data, userId);
}
export async function updateTaskBreakerTask(id: string, data: Partial<CreateTaskBreakerTaskDTO>): Promise<TaskBreakerTask> {
  const userId = getRequiredUserId();
  return getTaskBreakerService().update(id, data, userId);
}
export async function deleteTaskBreakerTask(id: string): Promise<void> {
  const userId = getRequiredUserId();
  return getTaskBreakerService().delete(id, userId);
}


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
