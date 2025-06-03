// src/services/indexeddb/task-breaker-saved-breakdown.indexeddb.service.ts
"use client";

import type { ITaskBreakerSavedBreakdownService } from '../interfaces/ITaskBreakerSavedBreakdownService';
import type { TaskBreakerSavedBreakdown, CreateTaskBreakerSavedBreakdownDTO } from '@/types';
import { getDb } from './db';

export class TaskBreakerSavedBreakdownIndexedDBService implements ITaskBreakerSavedBreakdownService {
  private getTable() {
    return getDb().taskBreakerSavedBreakdowns;
  }

  async getAll(userId: string): Promise<TaskBreakerSavedBreakdown[]> {
    if (!userId) {
      console.warn("TaskBreakerSavedBreakdownIndexedDBService.getAll: userId is required. Returning empty array.");
      return [];
    }
    return this.getTable()
      .where({ user_id: userId })
      .filter(breakdown => breakdown.sync_status !== 'deleted')
      .reverse().sortBy('created_at'); // Sort by most recent
  }

  async getById(id: string, userId: string): Promise<TaskBreakerSavedBreakdown | null> {
    if (!userId) {
      console.warn("TaskBreakerSavedBreakdownIndexedDBService.getById: userId is required.");
      return null;
    }
    const breakdown = await this.getTable().get(id);
    return (breakdown && breakdown.user_id === userId) ? breakdown : null;
  }

  async add(data: CreateTaskBreakerSavedBreakdownDTO, userId: string): Promise<TaskBreakerSavedBreakdown> {
    if (!userId) {
      throw new Error("TaskBreakerSavedBreakdownIndexedDBService.add: userId is required.");
    }
    const now = new Date().toISOString();
    const newBreakdown: TaskBreakerSavedBreakdown = {
      ...data,
      id: crypto.randomUUID(),
      user_id: userId,
      created_at: now,
      updated_at: now,
      sync_status: 'new',
      last_synced_at: undefined,
    };
    await this.getTable().add(newBreakdown);
    return newBreakdown;
  }

  async update(id: string, data: Partial<CreateTaskBreakerSavedBreakdownDTO>, userId: string): Promise<TaskBreakerSavedBreakdown> {
    if (!userId) {
      throw new Error("TaskBreakerSavedBreakdownIndexedDBService.update: userId is required.");
    }
    const existingBreakdown = await this.getTable().get(id);
    if (!existingBreakdown || existingBreakdown.user_id !== userId) {
      throw new Error('Saved Breakdown not found or access denied for update.');
    }
    const now = new Date().toISOString();
    const updatedBreakdownData: TaskBreakerSavedBreakdown = {
      ...existingBreakdown,
      ...data,
      updated_at: now,
      sync_status: existingBreakdown.sync_status === 'new' ? 'new' : 'updated',
    };
    await this.getTable().put(updatedBreakdownData);
    return updatedBreakdownData;
  }

  async delete(id: string, userId: string): Promise<void> {
    if (!userId) {
      throw new Error("TaskBreakerSavedBreakdownIndexedDBService.delete: userId is required.");
    }
    const existingBreakdown = await this.getById(id, userId);
    if (!existingBreakdown) {
      throw new Error('Saved Breakdown not found or access denied for deletion.');
    }

    if (existingBreakdown.sync_status === 'new') {
      await this.hardDelete(id);
    } else {
      await this.getTable().update(id, { sync_status: 'deleted', updated_at: new Date().toISOString() });
    }
  }

  // --- Sync Helper Methods ---
  async getPendingChanges(userId: string): Promise<TaskBreakerSavedBreakdown[]> {
    if (!userId) return [];
    return this.getTable()
      .where({ user_id: userId })
      .and(breakdown => ['new', 'updated', 'deleted'].includes(breakdown.sync_status!))
      .toArray();
  }

  async updateSyncStatus(id: string, serverTimestamp: string, newServerId?: string): Promise<void> {
    const updateData: Partial<TaskBreakerSavedBreakdown> = {
      sync_status: 'synced',
      last_synced_at: serverTimestamp,
      updated_at: serverTimestamp,
    };

    if (newServerId && newServerId !== id) {
      const oldItem = await this.getTable().get(id);
      if (oldItem) {
        await this.getTable().delete(id);
        const newItemWithServerId: TaskBreakerSavedBreakdown = { ...oldItem, ...updateData, id: newServerId };
        await this.getTable().put(newItemWithServerId);
      } else {
        await this.getTable().put({ ...updateData, id: newServerId } as TaskBreakerSavedBreakdown);
      }
    } else {
      await this.getTable().update(id, updateData);
    }
  }

  async hardDelete(id: string): Promise<void> {
    await this.getTable().delete(id);
  }

  async bulkUpdate(items: TaskBreakerSavedBreakdown[]): Promise<void> {
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
}
