
// src/services/indexeddb/time-focus-preset.indexeddb.service.ts
"use client";

import type { ITimeFocusPresetService } from '../interfaces/ITimeFocusPresetService';
import type { TimeFocusPreset, CreateTimeFocusPresetDTO } from '@/types';
import { getDb } from './db';

export class TimeFocusPresetIndexedDBService implements ITimeFocusPresetService {
  private getTable() {
    return getDb().timeFocusPresets;
  }

  async getAll(userId: string): Promise<TimeFocusPreset[]> {
    if (!userId) {
      console.warn("TimeFocusPresetIndexedDBService.getAll: userId is required. Returning empty array.");
      return [];
    }
    return this.getTable()
      .where({ user_id: userId })
      .filter(preset => preset.sync_status !== 'deleted')
      .sortBy('name');
  }

  async getById(id: string, userId: string): Promise<TimeFocusPreset | null> {
    if (!userId) {
      console.warn("TimeFocusPresetIndexedDBService.getById: userId is required.");
      return null;
    }
    const preset = await this.getTable().get(id);
    return (preset && preset.user_id === userId) ? preset : null;
  }

  async add(data: CreateTimeFocusPresetDTO, userId: string): Promise<TimeFocusPreset> {
    if (!userId) {
      throw new Error("TimeFocusPresetIndexedDBService.add: userId is required.");
    }
    const now = new Date().toISOString();
    const newPreset: TimeFocusPreset = {
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

  async update(id: string, data: Partial<CreateTimeFocusPresetDTO>, userId: string): Promise<TimeFocusPreset> {
    if (!userId) {
      throw new Error("TimeFocusPresetIndexedDBService.update: userId is required.");
    }
    const existingPreset = await this.getTable().get(id);
    if (!existingPreset || existingPreset.user_id !== userId) {
      throw new Error('TimeFocus Preset not found or access denied for update.');
    }
    const now = new Date().toISOString();
    const updatedPresetData: TimeFocusPreset = {
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
      throw new Error("TimeFocusPresetIndexedDBService.delete: userId is required.");
    }
    const existingPreset = await this.getById(id, userId); 
    if (!existingPreset) {
      throw new Error('TimeFocus Preset not found or access denied for deletion.');
    }

    if (existingPreset.sync_status === 'new') {
      await this.hardDelete(id);
    } else {
      await this.getTable().update(id, { sync_status: 'deleted', updated_at: new Date().toISOString() });
    }
  }

  // --- Sync Helper Methods ---
  async getPendingChanges(userId: string): Promise<TimeFocusPreset[]> {
    if (!userId) return [];
    return this.getTable()
      .where({ user_id: userId })
      .and(preset => ['new', 'updated', 'deleted'].includes(preset.sync_status!))
      .toArray();
  }

  async updateSyncStatus(id: string, serverTimestamp: string, newServerId?: string): Promise<void> {
    const updateData: Partial<TimeFocusPreset> = {
      sync_status: 'synced',
      last_synced_at: serverTimestamp,
      updated_at: serverTimestamp,
    };

    if (newServerId && newServerId !== id) {
      const oldItem = await this.getTable().get(id);
      if (oldItem) {
        await this.getTable().delete(id); 
        const newItemWithServerId: TimeFocusPreset = { 
            ...oldItem, 
            ...updateData, 
            id: newServerId 
        };
        await this.getTable().put(newItemWithServerId);
      } else {
        console.warn(`TimeFocusPresetIndexedDBService.updateSyncStatus: Local item with id ${id} not found for newServerId ${newServerId}. Record not created/updated.`);
      }
    } else {
      await this.getTable().update(id, updateData);
    }
  }

  async hardDelete(id: string): Promise<void> {
    await this.getTable().delete(id);
  }

  async bulkUpdate(items: TimeFocusPreset[]): Promise<void> {
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
