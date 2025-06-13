
// src/services/indexeddb/db.ts
"use client"; // Dexie runs in the browser

import Dexie, { type Table } from 'dexie';
import type { PriorityTask, Routine, RoutineStep, BrainDumpContent, TaskBreakerTask, TaskBreakerCustomPreset, TaskBreakerSavedBreakdown, PriorityGridCustomPreset, TimeFocusPreset, BrainDumpHistoryEntry } from '@/types';

export class EasyGenieDB extends Dexie {
  priorityTasks!: Table<PriorityTask, string>;
  routines!: Table<Routine, string>;
  routineSteps!: Table<RoutineStep, string>;
  brainDumps!: Table<BrainDumpContent, string>;
  brainDumpHistoryEntries!: Table<BrainDumpHistoryEntry, string>;
  taskBreakerTasks!: Table<TaskBreakerTask, string>;
  taskBreakerCustomPresets!: Table<TaskBreakerCustomPreset, string>;
  taskBreakerSavedBreakdowns!: Table<TaskBreakerSavedBreakdown, string>;
  priorityGridCustomPresets!: Table<PriorityGridCustomPreset, string>;
  timeFocusPresets!: Table<TimeFocusPreset, string>;

  constructor() {
    super('EasyGenieDB_v1'); // Database name

    // Version 7: Add brainDumpHistoryEntries table
    this.version(7).stores({
      priorityTasks: 'id, user_id, quadrant, created_at, updated_at, sync_status',
      routines: 'id, user_id, name, created_at, updated_at, sync_status',
      routineSteps: 'id, user_id, routine_id, order, created_at, updated_at, sync_status',
      brainDumps: 'id, user_id, created_at, updated_at, sync_status',
      brainDumpHistoryEntries: 'id, user_id, name, created_at, updated_at, sync_status',
      taskBreakerTasks: 'id, user_id, parent_id, order, created_at, updated_at, sync_status', // No estimated_time_minutes yet
      taskBreakerCustomPresets: 'id, user_id, name, created_at, updated_at, sync_status',
      taskBreakerSavedBreakdowns: 'id, user_id, name, created_at, updated_at, sync_status',
      priorityGridCustomPresets: 'id, user_id, name, created_at, updated_at, sync_status',
      timeFocusPresets: 'id, user_id, name, created_at, updated_at, sync_status',
    });

    // Version 8: Add estimated_time_minutes to taskBreakerTasks
    this.version(8).stores({
      priorityTasks: 'id, user_id, quadrant, created_at, updated_at, sync_status',
      routines: 'id, user_id, name, created_at, updated_at, sync_status',
      routineSteps: 'id, user_id, routine_id, order, created_at, updated_at, sync_status',
      brainDumps: 'id, user_id, created_at, updated_at, sync_status',
      brainDumpHistoryEntries: 'id, user_id, name, created_at, updated_at, sync_status',
      taskBreakerTasks: 'id, user_id, parent_id, order, created_at, updated_at, sync_status, estimated_time_minutes', // Added estimated_time_minutes
      taskBreakerCustomPresets: 'id, user_id, name, created_at, updated_at, sync_status',
      taskBreakerSavedBreakdowns: 'id, user_id, name, created_at, updated_at, sync_status',
      priorityGridCustomPresets: 'id, user_id, name, created_at, updated_at, sync_status',
      timeFocusPresets: 'id, user_id, name, created_at, updated_at, sync_status',
    }).upgrade(tx => {
      console.log("Upgrading EasyGenieDB to version 8. Added estimated_time_minutes to taskBreakerTasks.");
      // Migration logic if needed, e.g., setting default null for existing tasks
      return tx.table('taskBreakerTasks').toCollection().modify(task => {
        if (task.estimated_time_minutes === undefined) {
          task.estimated_time_minutes = null;
        }
      });
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
