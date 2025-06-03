// src/services/supabase/priority-grid-custom-preset.supabase.service.ts
import { supabase } from '@/lib/supabaseClient';
import type { IPriorityGridCustomPresetService } from '../interfaces/IPriorityGridCustomPresetService';
import type { PriorityGridCustomPreset, CreatePriorityGridCustomPresetDTO } from '@/types';

export class PriorityGridCustomPresetSupabaseService implements IPriorityGridCustomPresetService {
  private tableName = 'priority_grid_custom_presets';

  private mapToSupabase(data: CreatePriorityGridCustomPresetDTO | Partial<CreatePriorityGridCustomPresetDTO>, userId?: string): any {
    const { specificDate, specificTime, ...rest } = data; // Destructure to handle date/time specifically
    const payload: any = { ...rest };
    if (userId) payload.user_id = userId;
    if (specificDate !== undefined) payload.specific_date = specificDate === '' ? null : specificDate;
    if (specificTime !== undefined) payload.specific_time = specificTime === '' ? null : specificTime;
    return payload;
  }

  private mapFromSupabase(data: any): PriorityGridCustomPreset {
    const { specific_date, specific_time, ...rest } = data;
    return {
      ...rest,
      specificDate: specific_date,
      specificTime: specific_time,
    } as PriorityGridCustomPreset;
  }

  async getAll(userId: string): Promise<PriorityGridCustomPreset[]> {
    if (!userId) {
      console.warn("PriorityGridCustomPresetSupabaseService.getAll: userId is required. Returning empty array.");
      return [];
    }
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) {
      console.error("Error fetching Priority Grid custom presets from Supabase:", error);
      throw error;
    }
    return (data || []).map(this.mapFromSupabase);
  }

  async getById(id: string, userId: string): Promise<PriorityGridCustomPreset | null> {
    if (!userId) {
      console.warn("PriorityGridCustomPresetSupabaseService.getById: userId is required.");
      return null;
    }
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error(`Error fetching Priority Grid custom preset ${id} from Supabase:`, error);
      throw error;
    }
    return data ? this.mapFromSupabase(data) : null;
  }

  async add(presetData: CreatePriorityGridCustomPresetDTO, userId: string): Promise<PriorityGridCustomPreset> {
    if (!userId) {
      throw new Error("PriorityGridCustomPresetSupabaseService.add: userId is required.");
    }
    const presetToAdd = this.mapToSupabase(presetData, userId);
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(presetToAdd)
      .select()
      .single();

    if (error) {
      console.error("Error adding Priority Grid custom preset to Supabase:", error);
      throw error;
    }
    if (!data) throw new Error("Failed to add Priority Grid custom preset, no data returned.");
    return this.mapFromSupabase(data);
  }

  async update(id: string, presetData: Partial<CreatePriorityGridCustomPresetDTO>, userId: string): Promise<PriorityGridCustomPreset> {
    if (!userId) {
      throw new Error("PriorityGridCustomPresetSupabaseService.update: userId is required.");
    }
    const { user_id: ignored, ...updateDataRaw } = presetData as any;
    const updatePayload = this.mapToSupabase(updateDataRaw);
    
    const { data, error, count } = await supabase
      .from(this.tableName)
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating Priority Grid custom preset ${id} in Supabase:`, error);
       if (error.code === 'PGRST116' && count === 0) {
        const notFoundMsg = `Update for PG custom preset ${id} (user ${userId}) matched 0 rows.`;
        console.warn(notFoundMsg);
        const customError = new Error(notFoundMsg);
        (customError as any).code = 'PGRST116_ZERO_ROWS_AFFECTED_ON_UPDATE'; 
        throw customError;
      }
      throw error;
    }
    if (!data) {
        const notFoundMsg = `Failed to update PG custom preset ${id}, no data returned. Count: ${count}`;
        console.warn(notFoundMsg);
        const customError = new Error(notFoundMsg);
        (customError as any).code = 'PGRST116_ZERO_ROWS_RETURNED_ON_UPDATE_SUCCESS';
        throw customError;
    }
    return this.mapFromSupabase(data);
  }

  async delete(id: string, userId: string): Promise<void> {
    if (!userId) {
      throw new Error("PriorityGridCustomPresetSupabaseService.delete: userId is required.");
    }
    const { error, count } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error(`Error deleting Priority Grid custom preset ${id} from Supabase:`, error);
      throw error;
    }
    if (count === 0) {
        console.warn(`Supabase delete for PG custom preset ${id} (user ${userId}) affected 0 rows.`);
    }
  }
}
