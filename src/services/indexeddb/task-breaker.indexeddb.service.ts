
// src/services/indexeddb/task-breaker.indexeddb.service.ts
"use client";

import type { ITaskBreakerService } from '../interfaces/ITaskBreakerService';
import type { TaskBreakerTask, CreateTaskBreakerTaskDTO } from '@/types';
import { getDb } from './db';
import Dexie from 'dexie';

export class TaskBreakerIndexedDBService implements ITaskBreakerService {
  private getTable() {
    return getDb().taskBreakerTasks;
  }

  async getAll(userId: string): Promise<TaskBreakerTask[]> {
    if (!userId) {
      console.warn("TaskBreakerIndexedDBService.getAll: userId is required. Returning empty array.");
      return [];
    }
    return this.getTable()
      .where({ user_id: userId })
      .filter(task => task.sync_status !== 'deleted')
      .sortBy('order');
  }

  async getById(id: string, userId: string): Promise<TaskBreakerTask | null> {
    if (!userId) {
      console.warn("TaskBreakerIndexedDBService.getById: userId is required.");
      return null;
    }
    const task = await this.getTable().get(id);
    // Do not filter by sync_status here for getById
    return (task && task.user_id === userId) ? task : null;
  }

  async getTasksByParent(parentId: string | null, userId: string): Promise<TaskBreakerTask[]> {
    if (!userId) {
      console.warn("TaskBreakerIndexedDBService.getTasksByParent: userId is required. Returning empty array.");
      return [];
    }
    return this.getTable()
      .where({ user_id: userId, parent_id: parentId || Dexie.sohchen })
      .filter(task => task.sync_status !== 'deleted')
      .sortBy('order');
  }

  async add(data: CreateTaskBreakerTaskDTO, userId: string): Promise<TaskBreakerTask> {
    if (!userId) {
      throw new Error("TaskBreakerIndexedDBService.add: userId is required.");
    }
    const now = new Date().toISOString();
    let depth = data.depth ?? 0;
    if (data.parent_id) {
        const parentTask = await this.getTable().get(data.parent_id);
        if (parentTask && parentTask.user_id === userId) {
            depth = parentTask.depth + 1;
        } else {
            console.warn(`Parent task ${data.parent_id} not found for user ${userId} during add. Defaulting depth.`);
        }
    }

    const newTask: TaskBreakerTask = {
      ...data,
      id: crypto.randomUUID(),
      user_id: userId,
      is_completed: data.is_completed ?? false,
      depth: depth,
      created_at: now,
      updated_at: now,
      sync_status: 'new',
      last_synced_at: undefined,
    };
    await this.getTable().add(newTask);
    return newTask;
  }

  async update(id: string, data: Partial<CreateTaskBreakerTaskDTO>, userId: string): Promise<TaskBreakerTask> {
    if (!userId) {
      throw new Error("TaskBreakerIndexedDBService.update: userId is required.");
    }
    const existingTask = await this.getTable().get(id);
    if (!existingTask || existingTask.user_id !== userId) {
      throw new Error('TaskBreakerTask not found or access denied for update.');
    }
    
    const now = new Date().toISOString();
    let depth = existingTask.depth;
    if (data.parent_id !== undefined && data.parent_id !== existingTask.parent_id) {
        if (data.parent_id === null) {
            depth = 0;
        } else {
            const parentTask = await this.getTable().get(data.parent_id);
            depth = (parentTask && parentTask.user_id === userId) ? parentTask.depth + 1 : 0;
        }
    } else if (data.depth !== undefined) {
        depth = data.depth;
    }

    const updatedTaskData: TaskBreakerTask = {
      ...existingTask,
      ...data,
      depth: depth,
      updated_at: now,
      sync_status: existingTask.sync_status === 'new' ? 'new' : 'updated',
    };
    await this.getTable().put(updatedTaskData);
    return updatedTaskData;
  }

  private async recursivelySoftDeleteChildren(parentId: string, userId: string): Promise<void> {
    const children = await this.getTable().where({ parent_id: parentId, user_id: userId }).toArray();
    for (const child of children) {
      if (child.sync_status === 'new') {
        await this.hardDelete(child.id); // Hard delete if it was never synced
      } else {
        await this.getTable().update(child.id, { sync_status: 'deleted', updated_at: new Date().toISOString() });
        await this.recursivelySoftDeleteChildren(child.id, userId); // Recurse for grandchildren
      }
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    if (!userId) {
      throw new Error("TaskBreakerIndexedDBService.delete: userId is required.");
    }
    const existingTask = await this.getTable().get(id);
    if (!existingTask || existingTask.user_id !== userId) {
      throw new Error('TaskBreakerTask not found or access denied for deletion.');
    }

    if (existingTask.sync_status === 'new') {
      await this.hardDelete(id); // This will also hard delete children recursively
    } else {
      // Soft delete the task and its children
      await this.getTable().update(id, { sync_status: 'deleted', updated_at: new Date().toISOString() });
      await this.recursivelySoftDeleteChildren(id, userId);
    }
  }

  // --- Sync Helper Methods ---
  async getPendingChanges(userId: string): Promise<TaskBreakerTask[]> {
    return this.getTable()
      .where({ user_id: userId })
      .and(task => ['new', 'updated', 'deleted'].includes(task.sync_status!))
      .toArray();
  }

  async updateSyncStatus(id: string, serverTimestamp: string, newServerId?: string): Promise<void> {
    const updateData: Partial<TaskBreakerTask> = {
      sync_status: 'synced',
      last_synced_at: serverTimestamp,
      updated_at: serverTimestamp, 
    };
    if (newServerId && newServerId !== id) {
       // This is complex if IDs change for hierarchical data due to parent_id references.
       // Assume IDs are stable for now. A real ID change would need careful migration.
       console.warn(`TaskBreakerTask sync for ID ${id} received new server ID ${newServerId}. This is not fully handled for parent_id consistency.`);
       await this.getTable().update(id, {...updateData, id: newServerId});
    } else {
       await this.getTable().update(id, updateData);
    }
  }
  
  private async recursivelyHardDeleteChildren(parentId: string): Promise<void> {
    const children = await this.getTable().where({ parent_id: parentId }).toArray();
    for (const child of children) {
      await this.recursivelyHardDeleteChildren(child.id); // Recurse first
      await this.getTable().delete(child.id); // Then delete child
    }
  }
  
  async hardDelete(id: string): Promise<void> {
    await this.recursivelyHardDeleteChildren(id); // Delete all children first
    await this.getTable().delete(id); // Then delete the task itself
  }

  async bulkUpdate(items: TaskBreakerTask[]): Promise<void> {
    if (items.length === 0) return;
     await getDb().transaction('rw', this.getTable(), async () => {
        await this.getTable().bulkPut(items.map(item => ({...item, sync_status: 'synced', last_synced_at: item.updated_at })));
    });
  }
}
