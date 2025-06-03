// src/services/indexeddb/priority-grid-custom-preset.indexeddb.service.ts
"use client";

import type { IPriorityGridCustomPresetService } from '../interfaces/IPriorityGridCustomPresetService';
import type { PriorityGridCustomPreset, CreatePriorityGridCustomPresetDTO } from '@/types';
import { getDb } from './db';

export class PriorityGridCustomPresetIndexedDBService implements IPriorityGridCustomPresetService {
  private getTable() {
    return getDb().priorityGridCustomPresets;
  }

  async getAll(userId: string): Promise<PriorityGridCustomPreset[]> {
    if (!userId) {
      console.warn("PriorityGridCustomPresetIndexedDBService.getAll: userId is required. Returning empty array.");
      return [];
    }
    return this.getTable()
      .where({ user_id: userId })
      .filter(preset => preset.sync_status !== 'deleted')
      .sortBy('name');
  }

  async getById(id: string, userId: string): Promise<PriorityGridCustomPreset | null> {
    if (!userId) {
      console.warn("PriorityGridCustomPresetIndexedDBService.getById: userId is required.");
      return null;
    }
    const preset = await this.getTable().get(id);
    return (preset && preset.user_id === userId) ? preset : null;
  }

  async add(data: CreatePriorityGridCustomPresetDTO, userId: string): Promise<PriorityGridCustomPreset> {
    if (!userId) {
      throw new Error("PriorityGridCustomPresetIndexedDBService.add: userId is required.");
    }
    const now = new Date().toISOString();
    const newPreset: PriorityGridCustomPreset = {
      ...data,
      id: crypto.randomUUID(),
      user_id: userId,
      created_at: now,
      updated_at: now,
      sync_status: 'new',
      last_synced_at: undefined,
    };
    await this.getTable().add(newPreset);
    return newPreset;
  }

  async update(id: string, data: Partial<CreatePriorityGridCustomPresetDTO>, userId: string): Promise<PriorityGridCustomPreset> {
    if (!userId) {
      throw new Error("PriorityGridCustomPresetIndexedDBService.update: userId is required.");
    }
    const existingPreset = await this.getTable().get(id);
    if (!existingPreset || existingPreset.user_id !== userId) {
      throw new Error('Priority Grid Custom Preset not found or access denied for update.');
    }
    const now = new Date().toISOString();
    const updatedPresetData: PriorityGridCustomPreset = {
      ...existingPreset,
      ...data,
      updated_at: now,
      sync_status: existingPreset.sync_status === 'new' ? 'new' : 'updated',
    };
    await this.getTable().put(updatedPresetData);
    return updatedPresetData;
  }

  async delete(id: string, userId: string): Promise<void> {
    if (!userId) {
      throw new Error("PriorityGridCustomPresetIndexedDBService.delete: userId is required.");
    }
    const existingPreset = await this.getById(id, userId); // Ensures user ownership
    if (!existingPreset) {
      throw new Error('Priority Grid Custom Preset not found or access denied for deletion.');
    }

    if (existingPreset.sync_status === 'new') {
      await this.hardDelete(id);
    } else {
      await this.getTable().update(id, { sync_status: 'deleted', updated_at: new Date().toISOString() });
    }
  }

  // --- Sync Helper Methods ---
  async getPendingChanges(userId: string): Promise<PriorityGridCustomPreset[]> {
    if (!userId) return [];
    return this.getTable()
      .where({ user_id: userId })
      .and(preset => ['new', 'updated', 'deleted'].includes(preset.sync_status!))
      .toArray();
  }

  async updateSyncStatus(id: string, serverTimestamp: string, newServerId?: string): Promise<void> {
    const updateData: Partial<PriorityGridCustomPreset> = {
      sync_status: 'synced',
      last_synced_at: serverTimestamp,
      updated_at: serverTimestamp,
    };

    if (newServerId && newServerId !== id) {
      const oldItem = await this.getTable().get(id);
      if (oldItem) {
        await this.getTable().delete(id);
        const newItemWithServerId: PriorityGridCustomPreset = { ...oldItem, ...updateData, id: newServerId };
        await this.getTable().put(newItemWithServerId);
      } else {
        // This case should ideally not happen if an item was pending 'new'
        await this.getTable().put({ ...updateData, id: newServerId } as PriorityGridCustomPreset);
      }
    } else {
      await this.getTable().update(id, updateData);
    }
  }

  async hardDelete(id: string): Promise<void> {
    await this.getTable().delete(id);
  }

  async bulkUpdate(items: PriorityGridCustomPreset[]): Promise<void> {
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
