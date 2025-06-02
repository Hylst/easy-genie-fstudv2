// src/services/indexeddb/db.ts
"use client"; // Dexie runs in the browser

import Dexie, { type Table } from 'dexie';
import type { PriorityTask, Routine, RoutineStep, BrainDumpContent, TaskBreakerTask } from '@/types';

export class EasyGenieDB extends Dexie {
  priorityTasks!: Table<PriorityTask, string>; // string is the type of the primary key (id)
  routines!: Table<Routine, string>;
  routineSteps!: Table<RoutineStep, string>; // Primary key is string (id)
  brainDumps!: Table<BrainDumpContent, string>;
  taskBreakerTasks!: Table<TaskBreakerTask, string>;

  constructor() {
    super('EasyGenieDB_v1'); // Database name
    
    // Version 1: Initial schema or if you had '++id' for auto-incrementing numbers
    // this.version(1).stores({
    //   priorityTasks: '++internal_id, id, user_id, quadrant, created_at, updated_at', 
    //   // ... other tables
    // });

    // Version 2: Schema using UUIDs ('id') as primary keys and other indexed fields
    this.version(2).stores({
      priorityTasks: 'id, user_id, quadrant, created_at, updated_at', // 'id' is primary key
      routines: 'id, user_id, name, created_at, updated_at',
      routineSteps: 'id, user_id, routine_id, order, created_at, updated_at', // 'id' is primary key for step
      brainDumps: 'id, user_id, created_at, updated_at',
      taskBreakerTasks: 'id, user_id, parent_id, order, created_at, updated_at',
    }).upgrade(tx => {
      // This upgrade function runs if the client has an older version of the DB.
      // For a fresh setup or if version 1 didn't exist, this might not run or might run on empty tables.
      // If migrating from a schema where 'id' wasn't the PK or format changed, data migration logic would go here.
      console.log("Upgrading EasyGenieDB to version 2. Schema updated for UUID primary keys and indices.");
      // Example: if priorityTasks had numeric auto-inc PK before:
      // return tx.table("priorityTasks").toCollection().modify(task => {
      //   if (!task.id && task.internal_id) task.id = crypto.randomUUID(); // Ensure UUID exists
      //   delete task.internal_id; // Remove old PK if it was named differently
      // });
    });
  }
}

// Export a singleton instance of the database
let dbInstance: EasyGenieDB | null = null;

export const getDb = (): EasyGenieDB => {
  if (typeof window === 'undefined') {
    // This safeguard is mostly for development; Dexie is client-side.
    throw new Error("Dexie (IndexedDB) can only be used in the browser environment.");
  }
  if (!dbInstance) {
    dbInstance = new EasyGenieDB();
  }
  return dbInstance;
};
