
// src/services/indexeddb/task-breaker.indexeddb.service.ts
"use client";

import type { ITaskBreakerService } from '../interfaces/ITaskBreakerService';
import type { TaskBreakerTask, CreateTaskBreakerTaskDTO } from '@/types';
import { getDb } from './db';

export class TaskBreakerIndexedDBService implements ITaskBreakerService {
  private getTable() {
    return getDb().taskBreakerTasks;
  }

  async getAll(userId: string): Promise<TaskBreakerTask[]> {
    if (!userId) {
      console.warn("TaskBreakerIndexedDBService.getAll: userId is required. Returning empty array.");
      return [];
    }
    // This returns all tasks for the user. UI would be responsible for structuring them.
    return this.getTable().where({ user_id: userId }).sortBy('order');
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
    // Dexie doesn't directly support `null` in `where` for compound indexes in the same way SQL might.
    // If parentId is null, we fetch tasks where parent_id is undefined or null.
    // For simplicity here, we assume parent_id will be explicitly set to null for root tasks.
    return this.getTable()
      .where({ user_id: userId, parent_id: parentId || Dexie. solchen }) // Dexie.raw('') or Dexie.sohchen for null/empty
      .sortBy('order');
  }

  async add(data: CreateTaskBreakerTaskDTO, userId: string): Promise<TaskBreakerTask> {
    if (!userId) {
      throw new Error("TaskBreakerIndexedDBService.add: userId is required.");
    }
    const now = new Date().toISOString();

    // Determine depth
    let depth = 0;
    if (data.parent_id) {
        const parentTask = await this.getById(data.parent_id, userId);
        if (parentTask) {
            depth = parentTask.depth + 1;
        } else {
            console.warn(`Parent task with id ${data.parent_id} not found for user ${userId}. Defaulting depth to 0.`);
        }
    } else {
        depth = data.depth ?? 0; // Allow explicit depth for root tasks if needed, else 0
    }

    const newTask: TaskBreakerTask = {
      ...data,
      id: crypto.randomUUID(),
      user_id: userId,
      is_completed: data.is_completed ?? false,
      depth: depth, // Set calculated or default depth
      created_at: now,
      updated_at: now,
    };
    await this.getTable().add(newTask);
    return newTask;
  }

  async update(id: string, data: Partial<CreateTaskBreakerTaskDTO>, userId: string): Promise<TaskBreakerTask> {
    if (!userId) {
      throw new Error("TaskBreakerIndexedDBService.update: userId is required.");
    }
    const existingTask = await this.getById(id, userId);
    if (!existingTask) {
      throw new Error('TaskBreakerTask not found or access denied for update.');
    }
    
    const now = new Date().toISOString();
    // Recalculate depth if parent_id changes
    let depth = existingTask.depth;
    if (data.parent_id !== undefined && data.parent_id !== existingTask.parent_id) {
        if (data.parent_id === null) {
            depth = 0;
        } else {
            const parentTask = await this.getById(data.parent_id, userId);
            depth = parentTask ? parentTask.depth + 1 : 0;
        }
    } else if (data.depth !== undefined) {
        depth = data.depth; // Allow explicit depth update if parent_id isn't changing
    }


    const updatedTaskData: TaskBreakerTask = {
      ...existingTask,
      ...data,
      depth: depth,
      updated_at: now,
    };
    await this.getTable().put(updatedTaskData);
    return updatedTaskData;
  }

  async delete(id: string, userId: string): Promise<void> {
    if (!userId) {
      throw new Error("TaskBreakerIndexedDBService.delete: userId is required.");
    }
    const existingTask = await this.getById(id, userId);
    if (!existingTask) {
      throw new Error('TaskBreakerTask not found or access denied for deletion.');
    }
    // Recursively delete children tasks first to avoid orphaned data
    const children = await this.getTasksByParent(id, userId);
    for (const child of children) {
      await this.delete(child.id, userId); // Recursive call
    }
    await this.getTable().delete(id);
  }
}
