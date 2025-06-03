
// src/services/indexeddb/db.ts
"use client"; // Dexie runs in the browser

import Dexie, { type Table } from 'dexie';
import type { PriorityTask, Routine, RoutineStep, BrainDumpContent, TaskBreakerTask, TaskBreakerCustomPreset } from '@/types';

export class EasyGenieDB extends Dexie {
  priorityTasks!: Table<PriorityTask, string>; 
  routines!: Table<Routine, string>;
  routineSteps!: Table<RoutineStep, string>; 
  brainDumps!: Table<BrainDumpContent, string>;
  taskBreakerTasks!: Table<TaskBreakerTask, string>;
  taskBreakerCustomPresets!: Table<TaskBreakerCustomPreset, string>; // New table for custom presets

  constructor() {
    super('EasyGenieDB_v1'); // Database name
    
    // Version 2: Original schema using UUIDs ('id') as primary keys and other indexed fields
    // this.version(2).stores({
    //   priorityTasks: 'id, user_id, quadrant, created_at, updated_at', 
    //   routines: 'id, user_id, name, created_at, updated_at',
    //   routineSteps: 'id, user_id, routine_id, order, created_at, updated_at', 
    //   brainDumps: 'id, user_id, created_at, updated_at',
    //   taskBreakerTasks: 'id, user_id, parent_id, order, created_at, updated_at',
    // }).upgrade(tx => {
    //   console.log("Upgrading EasyGenieDB to version 2. Schema updated for UUID primary keys and indices.");
    // });

    // Version 3: Add taskBreakerCustomPresets table and sync_status index to existing tables
    this.version(3).stores({
      priorityTasks: 'id, user_id, quadrant, created_at, updated_at, sync_status',
      routines: 'id, user_id, name, created_at, updated_at, sync_status',
      routineSteps: 'id, user_id, routine_id, order, created_at, updated_at, sync_status',
      brainDumps: 'id, user_id, created_at, updated_at, sync_status',
      taskBreakerTasks: 'id, user_id, parent_id, order, created_at, updated_at, sync_status',
      taskBreakerCustomPresets: 'id, user_id, name, created_at, updated_at, sync_status', // New table schema
    }).upgrade(tx => {
      console.log("Upgrading EasyGenieDB to version 3. Added taskBreakerCustomPresets table and sync_status indices to existing tables.");
      // No data migration needed for adding new tables or indices to existing ones if fields already exist with correct types.
      // If sync_status was not on existing tables, Dexie handles adding it when records are updated/put.
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
