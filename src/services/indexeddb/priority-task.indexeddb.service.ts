
// src/services/indexeddb/priority-task.indexeddb.service.ts
"use client";

import type { IPriorityTaskService } from '../interfaces/IPriorityTaskService';
import type { PriorityTask, CreatePriorityTaskDTO } from '@/types';
import { getDb } from './db';
import Dexie from 'dexie';

export class PriorityTaskIndexedDBService implements IPriorityTaskService {
  private getTable() {
    return getDb().priorityTasks;
  }

  async getAll(userId: string): Promise<PriorityTask[]> {
    if (!userId) {
        console.warn("PriorityTaskIndexedDBService.getAll: userId is required but was not provided. Returning empty array.");
        return [];
    }
    // Filter out soft-deleted tasks
    return this.getTable()
        .where({ user_id: userId })
        .filter(task => task.sync_status !== 'deleted')
        .sortBy('created_at');
  }

  async getById(id: string, userId: string): Promise<PriorityTask | null> {
    if (!userId) {
        console.warn("PriorityTaskIndexedDBService.getById: userId is required.");
        return null;
    }
    const task = await this.getTable().get(id);
    // Do not filter by sync_status here for getById, as sync logic might need to access it.
    return (task && task.user_id === userId) ? task : null;
  }

  async add(data: CreatePriorityTaskDTO, userId: string): Promise<PriorityTask> {
    if (!userId) {
        throw new Error("PriorityTaskIndexedDBService.add: userId is required to add a task.");
    }
    const now = new Date().toISOString();
    const newTask: PriorityTask = {
      ...data,
      id: crypto.randomUUID(),
      user_id: userId,
      isCompleted: data.isCompleted ?? false,
      created_at: now,
      updated_at: now,
      sync_status: 'new', // Mark as new for sync
      last_synced_at: undefined,
    };
    await this.getTable().add(newTask);
    return newTask;
  }

  async update(id: string, data: Partial<CreatePriorityTaskDTO>, userId: string): Promise<PriorityTask> {
     if (!userId) {
        throw new Error("PriorityTaskIndexedDBService.update: userId is required to update a task.");
    }
    const existingTask = await this.getTable().get(id); // Get directly to check original sync_status
    if (!existingTask || existingTask.user_id !== userId) {
      throw new Error('Task not found or access denied for update.');
    }
    const now = new Date().toISOString();
    const updatedTaskData: PriorityTask = {
      ...existingTask,
      ...data,
      updated_at: now,
      // If it was 'new', it's still 'new' but updated. Otherwise, it's 'updated'.
      sync_status: existingTask.sync_status === 'new' ? 'new' : 'updated',
    };
    await this.getTable().put(updatedTaskData);
    return updatedTaskData;
  }

  async delete(id: string, userId: string): Promise<void> {
    if (!userId) {
        throw new Error("PriorityTaskIndexedDBService.delete: userId is required to delete a task.");
    }
    const existingTask = await this.getById(id, userId); // Use getById to ensure user ownership
    if (!existingTask) {
      throw new Error('Task not found or access denied for deletion.');
    }

    // If task was only local ('new'), hard delete it. Otherwise, soft delete.
    if (existingTask.sync_status === 'new') {
      await this.hardDelete(id);
    } else {
      await this.getTable().update(id, { sync_status: 'deleted', updated_at: new Date().toISOString() });
    }
  }

  // --- Sync Helper Methods ---
  async getPendingChanges(userId: string): Promise<PriorityTask[]> {
    if (!userId) return [];
    return this.getTable()
      .where({ user_id: userId })
      .and(task => ['new', 'updated', 'deleted'].includes(task.sync_status!))
      .toArray();
  }

  async updateSyncStatus(id: string, serverTimestamp: string, newServerId?: string): Promise<void> {
    const updateData: Partial<PriorityTask> = {
      sync_status: 'synced',
      last_synced_at: serverTimestamp,
      updated_at: serverTimestamp, // Assume server's timestamp is canonical after sync
    };

    if (newServerId && newServerId !== id) {
      const oldItem = await this.getTable().get(id);
      if (oldItem) {
        await this.getTable().delete(id); 
        const newItemWithServerId: PriorityTask = {
            ...oldItem,
            ...updateData, 
            id: newServerId, 
        };
        await this.getTable().put(newItemWithServerId); 
        console.log(`PriorityTaskIndexedDB: Synced local item ${id} to server ID ${newServerId}`);
      } else {
         await this.getTable().put({ ...updateData, id: newServerId } as PriorityTask);
      }
    } else {
      await this.getTable().update(id, updateData);
    }
  }

  async hardDelete(id: string): Promise<void> {
    await this.getTable().delete(id);
  }

  async bulkUpdate(items: PriorityTask[]): Promise<void> {
    if (items.length === 0) return;
    const itemsToPut = items.map(item => ({
      ...item,
      sync_status: 'synced' as const,
      last_synced_at: item.updated_at, 
    }));
    
    await getDb().transaction('rw', this.getTable(), async () => {
      await this.getTable().bulkPut(itemsToPut);
    });
  }

  // --- Bulk Delete Methods ---
  async deleteAll(userId: string): Promise<void> { // This is a soft delete for synced items
    const tasksToDelete = await this.getTable().where({ user_id: userId }).toArray();
    const updates: Partial<PriorityTask>[] = [];
    const hardDeleteIds: string[] = [];

    tasksToDelete.forEach(task => {
      if (task.sync_status === 'new') {
        hardDeleteIds.push(task.id);
      } else if (task.sync_status !== 'deleted') {
        updates.push({ id: task.id, sync_status: 'deleted', updated_at: new Date().toISOString() });
      }
    });

    if (hardDeleteIds.length > 0) await this.getTable().bulkDelete(hardDeleteIds);
    if (updates.length > 0) await this.getTable().bulkPut(updates as PriorityTask[]);
  }

  async deleteCompleted(userId: string): Promise<void> { // This is a soft delete for synced items
    const tasksToDelete = await this.getTable().where({ user_id: userId, isCompleted: true }).toArray();
    const updates: Partial<PriorityTask>[] = [];
    const hardDeleteIds: string[] = [];

    tasksToDelete.forEach(task => {
      if (task.sync_status === 'new') {
        hardDeleteIds.push(task.id);
      } else if (task.sync_status !== 'deleted') {
        updates.push({ id: task.id, sync_status: 'deleted', updated_at: new Date().toISOString() });
      }
    });
    if (hardDeleteIds.length > 0) await this.getTable().bulkDelete(hardDeleteIds);
    if (updates.length > 0) await this.getTable().bulkPut(updates as PriorityTask[]);
  }

  async hardDeleteAll(userId: string): Promise<void> {
    await this.getTable().where({ user_id: userId }).delete();
  }

  async hardDeleteCompleted(userId: string): Promise<void> {
    await this.getTable().where({ user_id: userId, isCompleted: true }).delete();
  }
}
