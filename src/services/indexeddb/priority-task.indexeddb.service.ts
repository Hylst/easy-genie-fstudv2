
// src/services/indexeddb/priority-task.indexeddb.service.ts
"use client";

import type { IPriorityTaskService } from '../interfaces/IPriorityTaskService';
import type { PriorityTask, CreatePriorityTaskDTO } from '@/types';
import { getDb } from './db';

export class PriorityTaskIndexedDBService implements IPriorityTaskService {
  private getTable() {
    return getDb().priorityTasks;
  }

  async getAll(userId: string): Promise<PriorityTask[]> {
    if (!userId) {
        console.warn("PriorityTaskIndexedDBService.getAll: userId is required but was not provided. Returning empty array.");
        return [];
    }
    return this.getTable().where({ user_id: userId }).sortBy('created_at');
  }

  async getById(id: string, userId: string): Promise<PriorityTask | null> {
    if (!userId) {
        console.warn("PriorityTaskIndexedDBService.getById: userId is required.");
        return null;
    }
    const task = await this.getTable().get(id);
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
      isCompleted: data.isCompleted ?? false, // Default to false if not provided
      created_at: now,
      updated_at: now,
    };
    await this.getTable().add(newTask);
    return newTask;
  }

  async update(id: string, data: Partial<CreatePriorityTaskDTO>, userId: string): Promise<PriorityTask> {
     if (!userId) {
        throw new Error("PriorityTaskIndexedDBService.update: userId is required to update a task.");
    }
    const existingTask = await this.getById(id, userId);
    if (!existingTask) {
      throw new Error('Task not found or access denied for update.');
    }
    const now = new Date().toISOString();
    const updatedTaskData: PriorityTask = {
      ...existingTask,
      ...data,
      updated_at: now,
    };
    await this.getTable().put(updatedTaskData); // put will update if exists, add if not (but getById ensures it exists)
    return updatedTaskData;
  }

  async delete(id: string, userId: string): Promise<void> {
    if (!userId) {
        throw new Error("PriorityTaskIndexedDBService.delete: userId is required to delete a task.");
    }
    // Ensure the task belongs to the user before deleting, though getTable().delete(id) might not directly support this.
    // A getById check first is safer.
    const existingTask = await this.getById(id, userId);
    if (!existingTask) {
      throw new Error('Task not found or access denied for deletion.');
    }
    await this.getTable().delete(id);
  }
}
