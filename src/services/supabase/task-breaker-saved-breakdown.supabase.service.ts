// src/services/supabase/task-breaker-saved-breakdown.supabase.service.ts
import { supabase } from '@/lib/supabaseClient';
import type { ITaskBreakerSavedBreakdownService } from '../interfaces/ITaskBreakerSavedBreakdownService';
import type { TaskBreakerSavedBreakdown, CreateTaskBreakerSavedBreakdownDTO } from '@/types';

export class TaskBreakerSavedBreakdownSupabaseService implements ITaskBreakerSavedBreakdownService {
  private tableName = 'task_breaker_saved_breakdowns';

  async getAll(userId: string): Promise<TaskBreakerSavedBreakdown[]> {
    if (!userId) {
      console.warn("TaskBreakerSavedBreakdownSupabaseService.getAll: userId is required. Returning empty array.");
      return [];
    }
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching saved breakdowns from Supabase:", error);
      throw error;
    }
    return data || [];
  }

  async getById(id: string, userId: string): Promise<TaskBreakerSavedBreakdown | null> {
    if (!userId) {
      console.warn("TaskBreakerSavedBreakdownSupabaseService.getById: userId is required.");
      return null;
    }
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error(`Error fetching saved breakdown ${id} from Supabase:`, error);
      throw error;
    }
    return data;
  }

  async add(breakdownData: CreateTaskBreakerSavedBreakdownDTO, userId: string): Promise<TaskBreakerSavedBreakdown> {
    if (!userId) {
      throw new Error("TaskBreakerSavedBreakdownSupabaseService.add: userId is required.");
    }
    const breakdownToAdd = { ...breakdownData, user_id: userId };
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(breakdownToAdd)
      .select()
      .single();

    if (error) {
      console.error("Error adding saved breakdown to Supabase:", error);
      throw error;
    }
    if (!data) throw new Error("Failed to add saved breakdown, no data returned.");
    return data as TaskBreakerSavedBreakdown;
  }

  async update(id: string, breakdownData: Partial<CreateTaskBreakerSavedBreakdownDTO>, userId: string): Promise<TaskBreakerSavedBreakdown> {
    if (!userId) {
      throw new Error("TaskBreakerSavedBreakdownSupabaseService.update: userId is required.");
    }
    const { user_id: ignored, ...updateData } = breakdownData as any;

    const { data, error, count } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating saved breakdown ${id} in Supabase:`, error);
      if (error.code === 'PGRST116' && count === 0) {
        const notFoundMsg = `Update for saved breakdown ${id} (user ${userId}) matched 0 rows.`;
        console.warn(notFoundMsg);
        const customError = new Error(notFoundMsg);
        (customError as any).code = 'PGRST116_ZERO_ROWS_AFFECTED_ON_UPDATE'; 
        throw customError;
      }
      throw error;
    }
    if (!data) {
        const notFoundMsg = `Failed to update saved breakdown ${id}, no data returned. Count: ${count}`;
        console.warn(notFoundMsg);
        const customError = new Error(notFoundMsg);
        (customError as any).code = 'PGRST116_ZERO_ROWS_RETURNED_ON_UPDATE_SUCCESS';
        throw customError;
    }
    return data as TaskBreakerSavedBreakdown;
  }

  async delete(id: string, userId: string): Promise<void> {
    if (!userId) {
      throw new Error("TaskBreakerSavedBreakdownSupabaseService.delete: userId is required.");
    }
    const { error, count } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error(`Error deleting saved breakdown ${id} from Supabase:`, error);
      throw error;
    }
    if (count === 0) {
      console.warn(`Supabase delete for saved breakdown ${id} (user ${userId}) affected 0 rows.`);
    }
  }
}
