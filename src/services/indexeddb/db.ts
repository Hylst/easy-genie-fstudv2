
// src/services/indexeddb/db.ts
"use client"; // Dexie runs in the browser

import Dexie, { type Table } from 'dexie';
import type { PriorityTask, Routine, RoutineStep, BrainDumpContent, TaskBreakerTask, TaskBreakerCustomPreset, TaskBreakerSavedBreakdown, PriorityGridCustomPreset, TimeFocusPreset } from '@/types';

export class EasyGenieDB extends Dexie {
  priorityTasks!: Table<PriorityTask, string>;
  routines!: Table<Routine, string>;
  routineSteps!: Table<RoutineStep, string>;
  brainDumps!: Table<BrainDumpContent, string>;
  taskBreakerTasks!: Table<TaskBreakerTask, string>;
  taskBreakerCustomPresets!: Table<TaskBreakerCustomPreset, string>;
  taskBreakerSavedBreakdowns!: Table<TaskBreakerSavedBreakdown, string>;
  priorityGridCustomPresets!: Table<PriorityGridCustomPreset, string>;
  timeFocusPresets!: Table<TimeFocusPreset, string>; // Added new table

  constructor() {
    super('EasyGenieDB_v1'); // Database name

    this.version(5).stores({
      priorityTasks: 'id, user_id, quadrant, created_at, updated_at, sync_status',
      routines: 'id, user_id, name, created_at, updated_at, sync_status',
      routineSteps: 'id, user_id, routine_id, order, created_at, updated_at, sync_status',
      brainDumps: 'id, user_id, created_at, updated_at, sync_status',
      taskBreakerTasks: 'id, user_id, parent_id, order, created_at, updated_at, sync_status',
      taskBreakerCustomPresets: 'id, user_id, name, created_at, updated_at, sync_status',
      taskBreakerSavedBreakdowns: 'id, user_id, name, created_at, updated_at, sync_status',
      priorityGridCustomPresets: 'id, user_id, name, created_at, updated_at, sync_status',
    });

    // Version 6: Add timeFocusPresets table
    this.version(6).stores({
      priorityTasks: 'id, user_id, quadrant, created_at, updated_at, sync_status',
      routines: 'id, user_id, name, created_at, updated_at, sync_status',
      routineSteps: 'id, user_id, routine_id, order, created_at, updated_at, sync_status',
      brainDumps: 'id, user_id, created_at, updated_at, sync_status',
      taskBreakerTasks: 'id, user_id, parent_id, order, created_at, updated_at, sync_status',
      taskBreakerCustomPresets: 'id, user_id, name, created_at, updated_at, sync_status',
      taskBreakerSavedBreakdowns: 'id, user_id, name, created_at, updated_at, sync_status',
      priorityGridCustomPresets: 'id, user_id, name, created_at, updated_at, sync_status',
      timeFocusPresets: 'id, user_id, name, created_at, updated_at, sync_status', // Added new table schema
    }).upgrade(tx => {
      console.log("Upgrading EasyGenieDB to version 6. Added timeFocusPresets table.");
    });
  }
}

// Export a singleton instance of the database
let dbInstance: EasyGenieDB | null = null;

export const getDb = (): EasyGenieDB => {
  if (typeof window === 'undefined') {
    throw new Error("Dexie (IndexedDB) can only be used in the browser environment.");
  }
  if (!dbInstance) {
    dbInstance = new EasyGenieDB();
  }
  return dbInstance;
};
