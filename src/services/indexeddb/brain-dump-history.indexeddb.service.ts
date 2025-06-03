
// src/services/indexeddb/brain-dump-history.indexeddb.service.ts
"use client";

import type { IBrainDumpHistoryService } from '../interfaces/IBrainDumpHistoryService';
import type { BrainDumpHistoryEntry, CreateBrainDumpHistoryEntryDTO } from '@/types';
import { getDb } from './db';

export class BrainDumpHistoryIndexedDBService implements IBrainDumpHistoryService {
  private getTable() {
    return getDb().brainDumpHistoryEntries;
  }

  async getAll(userId: string): Promise<BrainDumpHistoryEntry[]> {
    if (!userId) {
      console.warn("BrainDumpHistoryIndexedDBService.getAll: userId is required. Returning empty array.");
      return [];
    }
    return this.getTable()
      .where({ user_id: userId })
      .filter(entry => entry.sync_status !== 'deleted')
      .reverse().sortBy('created_at');
  }

  async getById(id: string, userId: string): Promise<BrainDumpHistoryEntry | null> {
    if (!userId) {
      console.warn("BrainDumpHistoryIndexedDBService.getById: userId is required.");
      return null;
    }
    const entry = await this.getTable().get(id);
    return (entry && entry.user_id === userId) ? entry : null;
  }

  async add(data: CreateBrainDumpHistoryEntryDTO, userId: string): Promise<BrainDumpHistoryEntry> {
    if (!userId) {
      throw new Error("BrainDumpHistoryIndexedDBService.add: userId is required.");
    }
    const now = new Date().toISOString();
    const newEntry: BrainDumpHistoryEntry = {
      ...data,
      id: crypto.randomUUID(),
      user_id: userId,
      created_at: now,
      updated_at: now,
      sync_status: 'new',
      last_synced_at: undefined,
    };
    await this.getTable().add(newEntry);
    return newEntry;
  }

  async update(id: string, data: Partial<CreateBrainDumpHistoryEntryDTO>, userId: string): Promise<BrainDumpHistoryEntry> {
    if (!userId) {
      throw new Error("BrainDumpHistoryIndexedDBService.update: userId is required.");
    }
    const existingEntry = await this.getTable().get(id);
    if (!existingEntry || existingEntry.user_id !== userId) {
      throw new Error('BrainDump History Entry not found or access denied for update.');
    }
    const now = new Date().toISOString();
    const updatedEntryData: BrainDumpHistoryEntry = {
      ...existingEntry,
      ...data,
      updated_at: now,
      sync_status: existingEntry.sync_status === 'new' ? 'new' : 'updated',
    };
    await this.getTable().put(updatedEntryData);
    return updatedEntryData;
  }

  async delete(id: string, userId: string): Promise<void> {
    if (!userId) {
      throw new Error("BrainDumpHistoryIndexedDBService.delete: userId is required.");
    }
    const existingEntry = await this.getById(id, userId);
    if (!existingEntry) {
      throw new Error('BrainDump History Entry not found or access denied for deletion.');
    }

    if (existingEntry.sync_status === 'new') {
      await this.hardDelete(id);
    } else {
      await this.getTable().update(id, { sync_status: 'deleted', updated_at: new Date().toISOString() });
    }
  }

  // --- Sync Helper Methods ---
  async getPendingChanges(userId: string): Promise<BrainDumpHistoryEntry[]> {
    if (!userId) return [];
    return this.getTable()
      .where({ user_id: userId })
      .and(entry => ['new', 'updated', 'deleted'].includes(entry.sync_status!))
      .toArray();
  }

  async updateSyncStatus(id: string, serverTimestamp: string, newServerId?: string): Promise<void> {
    const updateData: Partial<BrainDumpHistoryEntry> = {
      sync_status: 'synced',
      last_synced_at: serverTimestamp,
      updated_at: serverTimestamp,
    };

    if (newServerId && newServerId !== id) {
      const oldItem = await this.getTable().get(id);
      if (oldItem) {
        await this.getTable().delete(id);
        const newItemWithServerId: BrainDumpHistoryEntry = { ...oldItem, ...updateData, id: newServerId };
        await this.getTable().put(newItemWithServerId);
      } else {
        await this.getTable().put({ ...updateData, id: newServerId } as BrainDumpHistoryEntry);
      }
    } else {
      await this.getTable().update(id, updateData);
    }
  }

  async hardDelete(id: string): Promise<void> {
    await this.getTable().delete(id);
  }

  async bulkUpdate(items: BrainDumpHistoryEntry[]): Promise<void> {
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
