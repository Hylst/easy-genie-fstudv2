
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
    // IndexedDB doesn't inherently isolate by user_id unless explicitly designed.
    // For offline, we assume data belongs to the current user.
    // If sharing devices, user_id filtering becomes important even for local.
    return this.getTable().where({ user_id: userId }).toArray();
  }

  async getById(id: string, userId: string): Promise<PriorityTask | null> {
    const task = await this.getTable().get(id);
    return (task && task.user_id === userId) ? task : null;
  }

  async add(data: CreatePriorityTaskDTO, userId: string): Promise<PriorityTask> {
    const now = new Date().toISOString();
    const newTask: PriorityTask = {
      ...data,
      id: crypto.randomUUID(),
      user_id: userId,
      isCompleted: data.isCompleted || false,
      created_at: now,
      updated_at: now,
    };
    await this.getTable().add(newTask);
    return newTask;
  }

  async update(id: string, data: Partial<CreatePriorityTaskDTO>, userId: string): Promise<PriorityTask> {
    const existingTask = await this.getById(id, userId);
    if (!existingTask) {
      throw new Error('Task not found or access denied.');
    }
    const now = new Date().toISOString();
    const updatedTask: PriorityTask = {
      ...existingTask,
      ...data,
      updated_at: now,
    };
    await this.getTable().put(updatedTask);
    return updatedTask;
  }

  async delete(id: string, userId: string): Promise<void> {
    const existingTask = await this.getById(id, userId);
    if (!existingTask) {
      // To prevent deleting others' tasks if user_id check failed or was bypassed.
      throw new Error('Task not found or access denied for deletion.');
    }
    await this