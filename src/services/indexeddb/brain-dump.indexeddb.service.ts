
// src/services/indexeddb/brain-dump.indexeddb.service.ts
"use client";

import type { IBrainDumpService } from '../interfaces/IBrainDumpService';
import type { BrainDumpContent, CreateBrainDumpContentDTO } from '@/types';
import { getDb } from './db';

export class BrainDumpIndexedDBService implements IBrainDumpService {
  private getTable() {
    return getDb().brainDumps;
  }

  async getAll(userId: string): Promise<BrainDumpContent[]> {
    if (!userId) {
      console.warn("BrainDumpIndexedDBService.getAll: userId is required. Returning empty array.");
      return [];
    }
    // Typically, a user might only have one active or latest brain dump.
    // This method returns all for the user, sorted by most recent.
    return this.getTable().where({ user_id: userId }).reverse().sortBy('updated_at');
  }

  async getById(id: string, userId: string): Promise<BrainDumpContent | null> {
    if (!userId) {
      console.warn("BrainDumpIndexedDBService.getById: userId is required.");
      return null;
    }
    const dump = await this.getTable().get(id);
    return (dump && dump.user_id === userId) ? dump : null;
  }

  async add(data: CreateBrainDumpContentDTO, userId: string): Promise<BrainDumpContent> {
    if (!userId) {
      throw new Error("BrainDumpIndexedDBService.add: userId is required.");
    }
    const now = new Date().toISOString();
    const newDump: BrainDumpContent = {
      ...data,
      id: crypto.randomUUID(),
      user_id: userId,
      created_at: now,
      updated_at: now,
    };
    await this.getTable().add(newDump);
    return newDump;
  }

  async update(id: string, data: Partial<CreateBrainDumpContentDTO>, userId: string): Promise<BrainDumpContent> {
    if (!userId) {
      throw new Error("BrainDumpIndexedDBService.update: userId is required.");
    }
    const existingDump = await this.getById(id, userId);
    if (!existingDump) {
      throw new Error('BrainDump not found or access denied for update.');
    }
    const now = new Date().toISOString();
    const updatedDumpData: BrainDumpContent = {
      ...existingDump,
      ...data,
      updated_at: now,
    };
    await this.getTable().put(updatedDumpData);
    return updatedDumpData;
  }

  async delete(id: string, userId: string): Promise<void> {
    if (!userId) {
      throw new Error("BrainDumpIndexedDBService.delete: userId is required.");
    }
    const existingDump = await this.getById(id, userId);
    if (!existingDump) {
      throw new Error('BrainDump not found or access denied for deletion.');
    }
    await this.getTable().delete(id);
  }
}
