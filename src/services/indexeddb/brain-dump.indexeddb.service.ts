
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
    return this.getTable()
      .where({ user_id: userId })
      .filter(dump => dump.sync_status !== 'deleted')
      .reverse().sortBy('updated_at');
  }

  async getById(id: string, userId: string): Promise<BrainDumpContent | null> {
    if (!userId) {
      console.warn("BrainDumpIndexedDBService.getById: userId is required.");
      return null;
    }
    const dump = await this.getTable().get(id);
    // Do not filter by sync_status here, as sync logic might need to access 'deleted' items
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
      sync_status: 'new',
      last_synced_at: undefined,
    };
    await this.getTable().add(newDump);
    return newDump;
  }

  async update(id: string, data: Partial<CreateBrainDumpContentDTO>, userId: string): Promise<BrainDumpContent> {
    if (!userId) {
      throw new Error("BrainDumpIndexedDBService.update: userId is required.");
    }
    const existingDump = await this.getTable().get(id); // get directly to check original sync_status
    if (!existingDump || existingDump.user_id !== userId) {
      throw new Error('BrainDump not found or access denied for update.');
    }
    const now = new Date().toISOString();
    const updatedDumpData: BrainDumpContent = {
      ...existingDump,
      ...data,
      updated_at: now,
      sync_status: existingDump.sync_status === 'new' ? 'new' : 'updated',
    };
    await this.getTable().put(updatedDumpData);
    return updatedDumpData;
  }

  async delete(id: string, userId: string): Promise<void> {
    if (!userId) {
      throw new Error("BrainDumpIndexedDBService.delete: userId is required.");
    }
    const existingDump = await this.getTable().get(id);
    if (!existingDump || existingDump.user_id !== userId) {
      throw new Error('BrainDump not found or access denied for deletion.');
    }

    if (existingDump.sync_status === 'new') {
      await this.getTable().delete(id); // Hard delete
    } else {
      await this.getTable().update(id, { sync_status: 'deleted', updated_at: new Date().toISOString() }); // Soft delete
    }
  }

  // --- Sync Helper Methods ---
  async getPendingChanges(userId: string): Promise<BrainDumpContent[]> {
    return this.getTable()
      .where({ user_id: userId })
      .and(dump => ['new', 'updated', 'deleted'].includes(dump.sync_status!))
      .toArray();
  }

  async updateSyncStatus(id: string, serverTimestamp: string, newServerId?: string): Promise<void> {
    const updateData: Partial<BrainDumpContent> = {
      sync_status: 'synced',
      last_synced_at: serverTimestamp,
      updated_at: serverTimestamp, // Assume server's timestamp is canonical
    };
     if (newServerId && newServerId !== id) {
       await this.getTable().update(id, {...updateData, id: newServerId});
     } else {
        await this.getTable().update(id, updateData);
     }
  }

  async hardDelete(id: string): Promise<void> {
    await this.getTable().delete(id);
  }

  async bulkUpdate(items: BrainDumpContent[]): Promise<void> {
    if (items.length === 0) return;
    await getDb().transaction('rw', this.getTable(), async () => {
        await this.getTable().bulkPut(items.map(item => ({...item, sync_status: 'synced', last_synced_at: item.updated_at })));
    });
  }
}
