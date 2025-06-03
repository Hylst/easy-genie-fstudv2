
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
      .sortBy('order'); // Assuming top-level tasks are ordered, depth sorting is complex here
  }

  async getById(id: string, userId: string): Promise<TaskBreakerTask | null> {
    if (!userId) {
      console.warn("TaskBreakerIndexedDBService.getById: userId is required.");
      return null;
    }
    const task = await this.getTable().get(id);
    return (task && task.user_id === userId) ? task : null;
  }

  async getTasksByParent(parentId: string | null, userId: string): Promise<TaskBreakerTask[]> {
    if (!userId) {
      console.warn("TaskBreakerIndexedDBService.getTasksByParent: userId is required. Returning empty array.");
      return [];
    }
    return this.getTable()
      .where({ user_id: userId, parent_id: parentId || Dexie.sohchen }) // Dexie.sohchen for null parent_id
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
            console.warn(`Parent task ${data.parent_id} not found for user ${userId} during add. Defaulting depth based on DTO or to 0.`);
        }
    }

    const newTask: TaskBreakerTask = {
      id: crypto.randomUUID(),
      user_id: userId,
      text: data.text,
      parent_id: data.parent_id,
      main_task_text_context: data.main_task_text_context,
      is_completed: data.is_completed ?? false,
      depth: depth,
      order: data.order,
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
    } else if (data.depth !== undefined) { // Allow explicit depth update if parent_id not changing
        depth = data.depth;
    }

    const updatedTaskData: TaskBreakerTask = {
      ...existingTask,
      ...data, // Apply all partial data
      depth: depth, // Calculated or explicitly passed depth
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
      } else if (child.sync_status !== 'deleted') { // Avoid re-marking if already deleted
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
      await this.hardDelete(id); 
    } else {
      await this.getTable().update(id, { sync_status: 'deleted', updated_at: new Date().toISOString() });
      await this.recursivelySoftDeleteChildren(id, userId);
    }
  }

  async getPendingChanges(userId: string): Promise<TaskBreakerTask[]> {
    if (!userId) return [];
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
    
    const localItem = await this.getTable().get(id);
    if (!localItem) {
        console.warn(`TaskBreakerIndexedDBService.updateSyncStatus: Local item with id ${id} not found.`);
        // If newServerId exists, we could try to put a new item, but it might lack full data.
        // This scenario suggests a potential inconsistency. For now, we'll log and skip.
        return;
    }

    if (newServerId && newServerId !== id) {
      // This implies the server assigned a new ID (e.g., during an add operation where client-generated ID wasn't used or was overridden).
      // We need to delete the old local item and add/update with the new server ID.
      await this.getTable().delete(id);
      const newItemWithServerId: TaskBreakerTask = {
          ...localItem, // Spread original local data
          ...updateData, // Spread sync status and server timestamp
          id: newServerId, // Crucially, use the new server ID
      };
      await this.getTable().put(newItemWithServerId);
      console.log(`TaskBreakerIndexedDB: Synced local item ${id} to server ID ${newServerId}`);
    } else {
      await this.getTable().update(id, updateData);
    }
  }
  
  private async recursivelyHardDeleteChildren(parentId: string): Promise<void> {
    const children = await this.getTable().where({ parent_id: parentId }).toArray();
    for (const child of children) {
      await this.recursivelyHardDeleteChildren(child.id); 
      await this.getTable().delete(child.id); 
    }
  }
  
  async hardDelete(id: string): Promise<void> {
    await this.recursivelyHardDeleteChildren(id); 
    await this.getTable().delete(id); 
  }

  async bulkUpdate(items: TaskBreakerTask[]): Promise<void> {
    if (items.length === 0) return;
     await getDb().transaction('rw', this.getTable(), async () => {
        await this.getTable().bulkPut(items.map(item => ({...item, sync_status: 'synced', last_synced_at: item.updated_at })));
    });
  }
}
