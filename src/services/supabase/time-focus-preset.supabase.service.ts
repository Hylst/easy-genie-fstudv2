
// src/services/supabase/time-focus-preset.supabase.service.ts
import { supabase } from '@/lib/supabaseClient';
import type { ITimeFocusPresetService } from '../interfaces/ITimeFocusPresetService';
import type { TimeFocusPreset, CreateTimeFocusPresetDTO } from '@/types';

export class TimeFocusPresetSupabaseService implements ITimeFocusPresetService {
  private tableName = 'time_focus_presets';

  async getAll(userId: string): Promise<TimeFocusPreset[]> {
    if (!userId) {
      console.warn("TimeFocusPresetSupabaseService.getAll: userId is required. Returning empty array.");
      return [];
    }
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) {
      console.error("Error fetching TimeFocus presets from Supabase:", error);
      throw error;
    }
    return data || [];
  }

  async getById(id: string, userId: string): Promise<TimeFocusPreset | null> {
    if (!userId) {
      console.warn("TimeFocusPresetSupabaseService.getById: userId is required.");
      return null;
    }
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: 'No rows found'
      console.error(`Error fetching TimeFocus preset ${id} from Supabase:`, error);
      throw error;
    }
    return data;
  }

  async add(presetData: CreateTimeFocusPresetDTO, userId: string): Promise<TimeFocusPreset> {
    if (!userId) {
      throw new Error("TimeFocusPresetSupabaseService.add: userId is required.");
    }
    const presetToAdd = { ...presetData, user_id: userId };
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(presetToAdd)
      .select()
      .single();

    if (error) {
      console.error("Error adding TimeFocus preset to Supabase:", error);
      throw error;
    }
    if (!data) throw new Error("Failed to add TimeFocus preset, no data returned.");
    return data as TimeFocusPreset;
  }

  async update(id: string, presetData: Partial<CreateTimeFocusPresetDTO>, userId: string): Promise<TimeFocusPreset> {
    if (!userId) {
      throw new Error("TimeFocusPresetSupabaseService.update: userId is required.");
    }
    const { user_id: ignored, ...updateData } = presetData as any;
    
    const { data, error, count } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating TimeFocus preset ${id} in Supabase:`, error);
      if (error.code === 'PGRST116' && count === 0) {
        const notFoundMsg = `Update for TimeFocus preset ${id} (user ${userId}) matched 0 rows.`;
        console.warn(notFoundMsg);
        const customError = new Error(notFoundMsg);
        (customError as any).code = 'PGRST116_ZERO_ROWS_AFFECTED_ON_UPDATE'; 
        throw customError;
      }
      throw error;
    }
    if (!data) {
        const notFoundMsg = `Failed to update TimeFocus preset ${id}, no data returned. Count: ${count}`;
        console.warn(notFoundMsg);
        const customError = new Error(notFoundMsg);
        (customError as any).code = 'PGRST116_ZERO_ROWS_RETURNED_ON_UPDATE_SUCCESS';
        throw customError;
    }
    return data as TimeFocusPreset;
  }

  async delete(id: string, userId: string): Promise<void> {
    if (!userId) {
      throw new Error("TimeFocusPresetSupabaseService.delete: userId is required.");
    }
    const { error, count } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error(`Error deleting TimeFocus preset ${id} from Supabase:`, error);
      throw error;
    }
    if (count === 0) {
        console.warn(`Supabase delete for TimeFocus preset ${id} (user ${userId}) affected 0 rows.`);
    }
  }
}
