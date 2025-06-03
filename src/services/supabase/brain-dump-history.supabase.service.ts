
// src/services/supabase/brain-dump-history.supabase.service.ts
import { supabase } from '@/lib/supabaseClient';
import type { IBrainDumpHistoryService } from '../interfaces/IBrainDumpHistoryService';
import type { BrainDumpHistoryEntry, CreateBrainDumpHistoryEntryDTO } from '@/types';

export class BrainDumpHistorySupabaseService implements IBrainDumpHistoryService {
  private tableName = 'brain_dump_history_entries';

  async getAll(userId: string): Promise<BrainDumpHistoryEntry[]> {
    if (!userId) {
      console.warn("BrainDumpHistorySupabaseService.getAll: userId is required. Returning empty array.");
      return [];
    }
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching BrainDump history from Supabase:", error);
      throw error;
    }
    return data || [];
  }

  async getById(id: string, userId: string): Promise<BrainDumpHistoryEntry | null> {
    if (!userId) {
      console.warn("BrainDumpHistorySupabaseService.getById: userId is required.");
      return null;
    }
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error(`Error fetching BrainDump history entry ${id} from Supabase:`, error);
      throw error;
    }
    return data;
  }

  async add(entryData: CreateBrainDumpHistoryEntryDTO, userId: string): Promise<BrainDumpHistoryEntry> {
    if (!userId) {
      throw new Error("BrainDumpHistorySupabaseService.add: userId is required.");
    }
    const entryToAdd = { ...entryData, user_id: userId };
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(entryToAdd)
      .select()
      .single();

    if (error) {
      console.error("Error adding BrainDump history entry to Supabase:", error);
      throw error;
    }
    if (!data) throw new Error("Failed to add BrainDump history entry, no data returned.");
    return data as BrainDumpHistoryEntry;
  }

  async update(id: string, entryData: Partial<CreateBrainDumpHistoryEntryDTO>, userId: string): Promise<BrainDumpHistoryEntry> {
    if (!userId) {
      throw new Error("BrainDumpHistorySupabaseService.update: userId is required.");
    }
    const { user_id: ignored, ...updateData } = entryData as any;
    
    const { data, error, count } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating BrainDump history entry ${id} in Supabase:`, error);
      if (error.code === 'PGRST116' && count === 0) {
        const notFoundMsg = `Update for BrainDump history entry ${id} (user ${userId}) matched 0 rows.`;
        console.warn(notFoundMsg);
        const customError = new Error(notFoundMsg);
        (customError as any).code = 'PGRST116_ZERO_ROWS_AFFECTED_ON_UPDATE'; 
        throw customError;
      }
      throw error;
    }
    if (!data) {
        const notFoundMsg = `Failed to update BrainDump history entry ${id}, no data returned. Count: ${count}`;
        console.warn(notFoundMsg);
        const customError = new Error(notFoundMsg);
        (customError as any).code = 'PGRST116_ZERO_ROWS_RETURNED_ON_UPDATE_SUCCESS';
        throw customError;
    }
    return data as BrainDumpHistoryEntry;
  }

  async delete(id: string, userId: string): Promise<void> {
    if (!userId) {
      throw new Error("BrainDumpHistorySupabaseService.delete: userId is required.");
    }
    const { error, count } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error(`Error deleting BrainDump history entry ${id} from Supabase:`, error);
      throw error;
    }
    if (count === 0) {
        console.warn(`Supabase delete for BrainDump history entry ${id} (user ${userId}) affected 0 rows.`);
    }
  }
}
