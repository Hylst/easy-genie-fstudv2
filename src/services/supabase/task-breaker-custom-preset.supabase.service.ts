
// src/services/supabase/task-breaker-custom-preset.supabase.service.ts
import { supabase } from '@/lib/supabaseClient';
import type { ITaskBreakerCustomPresetService } from '../interfaces/ITaskBreakerCustomPresetService';
import type { TaskBreakerCustomPreset, CreateTaskBreakerCustomPresetDTO } from '@/types';

export class TaskBreakerCustomPresetSupabaseService implements ITaskBreakerCustomPresetService {
  private tableName = 'task_breaker_custom_presets';

  async getAll(userId: string): Promise<TaskBreakerCustomPreset[]> {
    if (!userId) {
      console.warn("TaskBreakerCustomPresetSupabaseService.getAll: userId is required. Returning empty array.");
      return [];
    }
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) {
      console.error("Error fetching custom presets from Supabase:", error);
      throw error;
    }
    return data || [];
  }

  async getById(id: string, userId: string): Promise<TaskBreakerCustomPreset | null> {
    if (!userId) {
      console.warn("TaskBreakerCustomPresetSupabaseService.getById: userId is required.");
      return null;
    }
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error(`Error fetching custom preset ${id} from Supabase:`, error);
      throw error;
    }
    return data;
  }

  async add(presetData: CreateTaskBreakerCustomPresetDTO, userId: string): Promise<TaskBreakerCustomPreset> {
    if (!userId) {
      throw new Error("TaskBreakerCustomPresetSupabaseService.add: userId is required.");
    }
    const presetToAdd = { ...presetData, user_id: userId };
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(presetToAdd)
      .select()
      .single();

    if (error) {
      console.error("Error adding custom preset to Supabase:", error);
      throw error;
    }
    if (!data) throw new Error("Failed to add custom preset, no data returned.");
    return data as TaskBreakerCustomPreset;
  }

  async update(id: string, presetData: Partial<CreateTaskBreakerCustomPresetDTO>, userId: string): Promise<TaskBreakerCustomPreset> {
    if (!userId) {
      throw new Error("TaskBreakerCustomPresetSupabaseService.update: userId is required.");
    }
    const { user_id: ignored, ...updateData } = presetData as any; // Ensure user_id isn't in update payload
    
    const { data, error, count } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error(`Error updating custom preset ${id} in Supabase:`, error);
       if (error.code === 'PGRST116' && count === 0) {
        const notFoundMsg = `Update for custom preset ${id} (user ${userId}) matched 0 rows.`;
        console.warn(notFoundMsg);
        const customError = new Error(notFoundMsg);
        (customError as any).code = 'PGRST116_ZERO_ROWS_AFFECTED_ON_UPDATE'; 
        throw customError;
      }
      throw error;
    }
     if (!data) {
        const notFoundMsg = `Failed to update custom preset ${id}, no data returned. Count: ${count}`;
        console.warn(notFoundMsg);
        const customError = new Error(notFoundMsg);
        (customError as any).code = 'PGRST116_ZERO_ROWS_RETURNED_ON_UPDATE_SUCCESS';
        throw customError;
    }
    return data as TaskBreakerCustomPreset;
  }

  async delete(id: string, userId: string): Promise<void> {
    if (!userId) {
      throw new Error("TaskBreakerCustomPresetSupabaseService.delete: userId is required.");
    }
    const { error, count } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error(`Error deleting custom preset ${id} from Supabase:`, error);
      throw error;
    }
     if (count === 0) {
        console.warn(`Supabase delete for custom preset ${id} (user ${userId}) affected 0 rows.`);
    }
  }
}
